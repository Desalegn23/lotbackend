import cron from 'node-cron';
import { Markup } from 'telegraf';
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
            select: { ticketNumber: true }
          },
          reservations: {
            where: { status: { in: ['APPROVED', 'PENDING'] } },
            include: {
              tickets: {
                include: { ticket: { select: { ticketNumber: true } } }
              }
            }
          },
          _count: {
            select: {
              tickets: { where: { status: 'AVAILABLE' } }
            }
          },
          prizeDistribution: {
            orderBy: { position: 'asc' }
          }
        }
      });

      for (const lottery of lotteries) {
        const agent = lottery.agent;
        if (!agent) continue;

        // Resolve settings: Lottery overrides Agent
        const notifyInterval = (lottery as any).notifyInterval || agent.notifyInterval;
        const notifyThreshold = (lottery as any).notifyThreshold !== null ? (lottery as any).notifyThreshold : agent.notifyThreshold;
        const notifyLanguage = (lottery as any).notifyLanguage || agent.notifyLanguage || 'EN';
        const notifyShowHolders = (lottery as any).notifyShowHolders !== null ? (lottery as any).notifyShowHolders : (agent as any).notifyShowHolders;
        const resolvedCustomMessage = (lottery as any).customMessage || agent.customMessage;

        // 1. Check if notifications are disabled
        if (notifyInterval === 'DISABLED') continue;

        // 2. Check Interval (Heuristic)
        let shouldNotify = false;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        if (notifyInterval === '1M') {
          shouldNotify = true;
        } else if (notifyInterval === '5M' && currentMinute % 5 === 0) {
          shouldNotify = true;
        } else if (notifyInterval === '15M' && currentMinute % 15 === 0) {
          shouldNotify = true;
        } else if (notifyInterval === '30M' && currentMinute % 30 === 0) {
          shouldNotify = true;
        } else if (notifyInterval === '1H' && currentMinute === 0) {
          shouldNotify = true;
        } else if (notifyInterval === '2H' && currentMinute === 0 && currentHour % 2 === 0) {
          shouldNotify = true;
        } else if (notifyInterval === '4H' && currentMinute === 0 && currentHour % 4 === 0) {
          shouldNotify = true;
        } else if (notifyInterval === '12H' && currentMinute === 0 && currentHour % 12 === 0) {
          shouldNotify = true;
        } else if (notifyInterval === 'DAILY' && currentMinute === 0 && currentHour === 20) {
          shouldNotify = true;
        } else if (!['1M', '5M', '15M', '30M', '1H', '2H', '4H', '12H', 'DAILY'].includes(notifyInterval)) {
          // Default/Unknown - run hourly as fallback if it happens to be at minute 0
          if (currentMinute === 0) shouldNotify = true;
        }

        if (!shouldNotify) continue;

        // 3. Check Threshold
        const availableCount = (lottery as any)._count.tickets;
        const percentRemaining = (availableCount / lottery.totalTickets) * 100;
        
        if (percentRemaining > notifyThreshold) continue;
        if (availableCount === 0) continue;

        // 4. Construct Message based on Language
        const lang = notifyLanguage;
        const remainingNums = lottery.tickets.map(t => t.ticketNumber).join(', ');
        
        const prizeList = lottery.prizeDistribution.map(p => {
          const suffix = lang === 'AM' ? 'ኛ' : (p.position === 1 ? 'st' : p.position === 2 ? 'nd' : p.position === 3 ? 'rd' : 'th');
          return `${p.position}${suffix}: ${p.prizeAmount}`;
        }).join(', ');
        const prizeDisplay = prizeList || (lang === 'AM' ? 'ታላላቅ ሽልማቶች' : 'Amazing prizes');

        // 5. Construct Holders list if enabled
        let holdersText = "";
        if (notifyShowHolders && (lottery as any).reservations?.length > 0) {
          const list = (lottery as any).reservations.map((r: any) => {
            const ticketNums = r.tickets.map((rt: any) => `#${rt.ticket.ticketNumber}`).join(', ');
            return `👤 ${r.name} (${ticketNums})`;
          }).join(', ');
          holdersText = lang === 'AM' ? `\n\n📝 <b>የተያዙ ቲኬቶች:</b>\n${list}` : `\n\n📝 <b>Ticket Holders:</b>\n${list}`;
        }

        let message = "";
        if (resolvedCustomMessage) {
          // Use custom template if provided
          message = resolvedCustomMessage
            .replace('{title}', lottery.title)
            .replace('{count}', availableCount.toString())
            .replace('{price}', lottery.ticketPrice.toString())
            .replace('{prize}', prizeDisplay)
            .replace('{numbers}', remainingNums)
            .replace('{holders}', holdersText.trim()); // Remove extra newlines if used as tag
        } else if (lang === 'AM') {
          // Default Amharic
          message = `🔥 <b>ፈጥነው ይውሰዱ! የቀሩት ${availableCount} ቲኬቶች ብቻ ናቸው!</b> 🔥\n\n` +
            `<b>${lottery.title}</b>\n` +
            `ያልተያዙ ቁጥሮች: ${remainingNums}\n\n` +
            `በ <b>${lottery.ticketPrice} ብር</b> ብቻ የ <b>${prizeDisplay}</b> ባለዕድል ይሁኑ!\n` +
            `አሁኑኑ ይሞክሩ! 🍀` + holdersText;
        } else {
          // Default English
          message = `🔥 <b>HURRY! ONLY ${availableCount} TICKETS LEFT!</b> 🔥\n\n` +
            `<b>${lottery.title}</b>\n` +
            `Remaining numbers: ${remainingNums}\n\n` +
            `For just <b>ETB ${lottery.ticketPrice}</b> per ticket, who will win <b>${prizeDisplay}</b>?\n` +
            `Try your luck now! 🍀` + holdersText;
        }

        const targetGroupId = (lottery as any).telegramGroupId;
        const btnText = lang === 'AM' ? "🍀 አሁኑኑ ዕድልዎን ይሞክሩ" : "🍀 Try your luck now";
        const markup = Markup.inlineKeyboard([
          [Markup.button.url(btnText, NotificationService.getDeepLink(`lottery_${lottery.id}`))]
        ]);

        if (targetGroupId) {
          await NotificationService.sendToGroup(targetGroupId, message, markup);
        } else {
          await NotificationService.sendToAgentGroups(lottery.agentId, message, markup);
        }

        // Also notify the agent personally if capacity is low
        if (agent.user?.telegramId) {
          const personalMsg = lang === 'AM'
            ? `⚠️ <b>ቲኬቶች ሊያልቁ ነው!</b>\n<b>${lottery.title}</b> የቀሩት <b>${availableCount}</b> ቲኬቶች ብቻ ናቸው (${Math.round(percentRemaining)}%)。`
            : `⚠️ <b>Almost Sold Out!</b>\n<b>${lottery.title}</b> has only <b>${availableCount}</b> tickets remaining (${Math.round(percentRemaining)}%).`;
            
          await NotificationService.sendToUser(agent.user.telegramId, personalMsg);
        }
      }
    } catch (e) {
      console.error('[CRON] Failed to send urgency marketing messages', e);
    }
  }
}
