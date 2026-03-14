import prisma from '../db/prisma.js';

export class AdminService {
  static async getSystemSummary() {
    const [
      lotteryCount,
      activeLotteries,
      ticketCount,
      userCount,
      agentCount,
      allLotteries
    ] = await Promise.all([
      prisma.lottery.count(),
      prisma.lottery.count({ where: { status: 'ACTIVE' } }),
      prisma.ticket.count({ where: { status: 'SOLD' } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.agent.count(),
      prisma.lottery.findMany({
        include: {
          winners: true
        }
      })
    ]);

    // Calculate Global Revenue (Sum of all agent revenues for now)
    // Formula: (ticketPrice * totalTickets) - (sum of winner prizeAmount)
    let totalRevenue = 0;
    allLotteries.forEach(l => {
      const lotteryRevenue = (l.ticketPrice * l.totalTickets);
      const prizeSum = l.winners.reduce((sum, w) => sum + w.prizeAmount, 0);
      totalRevenue += (lotteryRevenue - prizeSum);
    });

    return {
      lotteries: lotteryCount,
      activeLotteries,
      tickets: ticketCount,
      totalUsers: userCount,
      totalAgents: agentCount,
      totalRevenue
    };
  }

  static async getRecentActivities() {
    // Recent ticket sales/reservations
    const activities = await prisma.reservation.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        lottery: true,
        tickets: {
          include: {
            ticket: true
          }
        }
      }
    });

    return activities.map(a => ({
      id: a.id,
      userName: a.name,
      lotteryTitle: a.lottery.title,
      ticketNumber: a.tickets[0]?.ticket?.ticketNumber || 0,
      status: a.status,
      reservedBy: a.reservedByAgent ? 'AGENT' : 'USER',
      createdAt: a.createdAt
    }));
  }
}
