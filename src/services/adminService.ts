import prisma from '../db/prisma.js';

export class AdminService {
  static async getSystemSummary() {
    const [
      lotteryCount,
      activeLotteries,
      ticketCount,
      userCount,
      agentCount,
      allLotteries,
      winnerStats,
      salesToday
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
      }),
      prisma.winner.aggregate({
        _sum: {
          prizeAmount: true
        },
        _count: true,
        _max: {
          prizeAmount: true
        }
      }),
      prisma.ticket.count({
        where: {
          status: 'SOLD',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    // Calculate Global Revenue
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
      totalRevenue,
      totalPayouts: winnerStats._sum.prizeAmount || 0,
      totalWinners: winnerStats._count || 0,
      biggestWin: winnerStats._max.prizeAmount || 0,
      salesToday: salesToday,
      systemStatus: {
        api: 'Online',
        db: 'Online',
        payments: 'Delayed'
      }
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
