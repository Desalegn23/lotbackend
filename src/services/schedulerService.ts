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

    // Urgency/Marketing scan — every 2 hours
    cron.schedule('0 */2 * * *', async () => {
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
   * Urgency/Marketing — Checks active lotteries. If a lottery has ≤20% tickets
   * remaining, broadcasts a promotional message to the agent's groups.
   */
  static async sendUrgencyMarketingMessages() {
    try {
      const lotteries = await prisma.lottery.findMany({
        where: { status: 'ACTIVE' },
        include: {
          agent: { include: { user: true } },
          tickets: {
            where: { status: 'AVAILABLE' },
            orderBy: { ticketNumber: 'asc' },
            take: 10, // Show up to 10 remaining numbers
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
        const availableCount = (lottery as any)._count.tickets;
        const percentRemaining = (availableCount / lottery.totalTickets) * 100;

        // Only broadcast urgency if ≤20% tickets remain
        if (percentRemaining > 20) continue;
        if (availableCount === 0) continue;

        const remainingNums = lottery.tickets.map(t => t.ticketNumber).join(', ');
        const topPrize = lottery.prizeDistribution[0]?.prizeAmount || 'Amazing prizes';

        await NotificationService.sendToAgentGroups(
          lottery.agentId,
          `🔥 <b>HURRY! ONLY ${availableCount} TICKETS LEFT!</b> 🔥\n\n` +
          `<b>${lottery.title}</b>\n` +
          `Remaining numbers: ${remainingNums}${availableCount > 10 ? '...' : ''}\n\n` +
          `For just <b>ETB ${lottery.ticketPrice}</b> per ticket, who will win <b>${topPrize}</b>?\n` +
          `Try your chance now! 🍀`
        );

        // Also notify the agent personally about capacity
        if (lottery.agent?.user?.telegramId) {
          await NotificationService.sendToUser(
            lottery.agent.user.telegramId,
            `⚠️ <b>Almost Sold Out!</b>\n<b>${lottery.title}</b> has only <b>${availableCount}</b> tickets remaining (${Math.round(percentRemaining)}%).`
          );
        }
      }
    } catch (e) {
      console.error('[CRON] Failed to send urgency marketing messages', e);
    }
  }
}
