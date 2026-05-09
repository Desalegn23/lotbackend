import cron from 'node-cron';
import prisma from '../db/prisma.js';
import { NotificationService } from './notificationService.js';

export class SchedulerService {
  static initialize() {
    // Daily Sales Summary for agents — every day at 8:00 PM (20:00)
    cron.schedule('0 20 * * *', async () => {
      console.log('[CRON] Running daily agent sales summary...');
      await this.sendDailyAgentSummaries();
    });

    // Urgency/Marketing scan — every minute
    cron.schedule('* * * * *', async () => {
      console.log('[CRON] Running urgency marketing scan...');
      await this.sendUrgencyMarketingMessages();
    });

    console.log('Scheduler initialized. Cron jobs registered.');
  }

  /**
   * Daily Sales Summary — Sends each agent a personal recap of today's sales.
   */
  static async sendDailyAgentSummaries() {
    try {
      const agents = await prisma.agent.findMany({
        include: {
          user: true,
          lotteries: {
            where: { status: 'ACTIVE' },
            include: {
              _count: {
                select: { tickets: { where: { status: 'SOLD' } } }
              }
            }
          }
        }
      });

      for (const agent of agents) {
        if (!agent.user.telegramId) continue;

        const activeLotteries = agent.lotteries.length;
        let totalSold = 0;
        let totalRevenue = 0;

        agent.lotteries.forEach((l: any) => {
          totalSold += l._count.tickets;
          totalRevenue += l._count.tickets * l.ticketPrice;
        });

        // Only send if there are active lotteries
        if (activeLotteries === 0) continue;

        await NotificationService.sendToUser(
          agent.user.telegramId,
          `📊 <b>Daily Summary</b>\n` +
          `Active Lotteries: <b>${activeLotteries}</b>\n` +
          `Total Tickets Sold: <b>${totalSold}</b>\n` +
          `Total Revenue: <b>ETB ${totalRevenue.toLocaleString()}</b>\n\n` +
          `Keep up the great work! 💪`
        );
      }
    } catch (e) {
      console.error('[CRON] Failed to send daily agent summaries', e);
    }
  }

  /**
   * Urgency/Marketing — Checks active lotteries.
   * Respects Agent settings: notifyInterval, notifyThreshold, notifyLanguage, customMessage.
   */
  static async sendUrgencyMarketingMessages() {
    try {
      const currentHour = new Date().getHours();
      
      const lotteries = await prisma.lottery.findMany({
        where: { status: 'ACTIVE' },
        include: {
          agent: { include: { user: true } },
          tickets: {
            where: { status: 'AVAILABLE' },
            orderBy: { ticketNumber: 'asc' },
            take: 10,
            select: { ticketNumber: true }
          },
          _count: {
            select: {
              tickets: { where: { status: 'AVAILABLE' } }
            }
          },
          prizeDistribution: {
            orderBy: { position: 'asc' },
            take: 1
          }
        }
      });

      for (const lottery of lotteries) {
        const agent = lottery.agent;
        if (!agent) continue;

        // 1. Check if notifications are disabled
        if (agent.notifyInterval === 'DISABLED') continue;

        // 2. Check Interval (Heuristic)
        let shouldNotify = false;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const interval = agent.notifyInterval;

        if (interval === '1M') {
          shouldNotify = true;
        } else if (interval === '5M' && currentMinute % 5 === 0) {
          shouldNotify = true;
        } else if (interval === '15M' && currentMinute % 15 === 0) {
          shouldNotify = true;
        } else if (interval === '30M' && currentMinute % 30 === 0) {
          shouldNotify = true;
        } else if (interval === '1H' && currentMinute === 0) {
          shouldNotify = true;
        } else if (interval === '2H' && currentMinute === 0 && currentHour % 2 === 0) {
          shouldNotify = true;
        } else if (interval === '4H' && currentMinute === 0 && currentHour % 4 === 0) {
          shouldNotify = true;
        } else if (interval === '12H' && currentMinute === 0 && currentHour % 12 === 0) {
          shouldNotify = true;
        } else if (interval === 'DAILY' && currentMinute === 0 && currentHour === 20) {
          shouldNotify = true;
        } else if (!['1M', '5M', '15M', '30M', '1H', '2H', '4H', '12H', 'DAILY'].includes(interval)) {
          // Default/Unknown - run hourly as fallback if it happens to be at minute 0
          if (currentMinute === 0) shouldNotify = true;
        }

        if (!shouldNotify) continue;

        // 3. Check Threshold
        const availableCount = (lottery as any)._count.tickets;
        const percentRemaining = (availableCount / lottery.totalTickets) * 100;
        
        const threshold = agent.notifyThreshold || 20;
        if (percentRemaining > threshold) continue;
        if (availableCount === 0) continue;

        // 4. Construct Message based on Language
        const lang = agent.notifyLanguage || 'EN';
        const remainingNums = lottery.tickets.map(t => t.ticketNumber).join(', ');
        const topPrize = lottery.prizeDistribution[0]?.prizeAmount || (lang === 'AM' ? 'ታላላቅ ሽልማቶች' : 'Amazing prizes');

        let message = "";
        if (agent.customMessage) {
          // Use custom template if provided
          message = agent.customMessage
            .replace('{title}', lottery.title)
            .replace('{count}', availableCount.toString())
            .replace('{price}', lottery.ticketPrice.toString())
            .replace('{prize}', topPrize)
            .replace('{numbers}', remainingNums);
        } else if (lang === 'AM') {
          // Default Amharic
          message = `🔥 <b>ፈጥነው ይውሰዱ! የቀሩት ${availableCount} ቲኬቶች ብቻ ናቸው!</b> 🔥\n\n` +
            `<b>${lottery.title}</b>\n` +
            `ያልተያዙ ቁጥሮች: ${remainingNums}${availableCount > 10 ? '...' : ''}\n\n` +
            `በ <b>${lottery.ticketPrice} ብር</b> ብቻ የ <b>${topPrize}</b> ባለዕድል ይሁኑ!\n` +
            `አሁኑኑ ይሞክሩ! 🍀`;
        } else {
          // Default English
          message = `🔥 <b>HURRY! ONLY ${availableCount} TICKETS LEFT!</b> 🔥\n\n` +
            `<b>${lottery.title}</b>\n` +
            `Remaining numbers: ${remainingNums}${availableCount > 10 ? '...' : ''}\n\n` +
            `For just <b>ETB ${lottery.ticketPrice}</b> per ticket, who will win <b>${topPrize}</b>?\n` +
            `Try your chance now! 🍀`;
        }

        await NotificationService.sendToAgentGroups(lottery.agentId, message);

        // Also notify the agent personally if capacity is low
        if (agent.user?.telegramId) {
          const personalMsg = lang === 'AM'
            ? `⚠️ <b>ቲኬቶች ሊያልቁ ነው!</b>\n<b>${lottery.title}</b> የቀሩት <b>${availableCount}</b> ቲኬቶች ብቻ ናቸው (${Math.round(percentRemaining)}%)።`
            : `⚠️ <b>Almost Sold Out!</b>\n<b>${lottery.title}</b> has only <b>${availableCount}</b> tickets remaining (${Math.round(percentRemaining)}%).`;
            
          await NotificationService.sendToUser(agent.user.telegramId, personalMsg);
        }
      }
    } catch (e) {
      console.error('[CRON] Failed to send urgency marketing messages', e);
    }
  }
}
