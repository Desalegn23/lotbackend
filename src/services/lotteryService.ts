import prisma from '../db/prisma.js';
import { LotteryStatus, TicketStatus, PrizeType } from '@prisma/client';

export class LotteryService {
  static async createLottery(data: {
    agentId: string; // This is the userId from the auth middleware
    title: string;
    description?: string;
    ticketPrice: number;
    totalTickets: number;
    status?: LotteryStatus; // Made status optional with default
    prizes: { position: number; amount: number; prizeType?: string; description?: string }[];
  }) {
    // 1. Resolve agent.id from userId
    const agent = await prisma.agent.findUnique({
      where: { userId: data.agentId },
    });

    if (!agent) {
      throw new Error('Agent profile not found');
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Create the lottery record
      const lottery = await tx.lottery.create({
        data: {
          agentId: agent.id, // Use the resolved agent record ID
          title: data.title,
          description: data.description,
          ticketPrice: data.ticketPrice,
          totalTickets: data.totalTickets,
          status: data.status || LotteryStatus.ACTIVE, // Use provided status or default to ACTIVE
          prizeDistribution: {
            create: data.prizes.map((p) => ({
              position: p.position,
              prizeAmount: p.amount.toString(), // Convert to string
              prizeType: (p.prizeType as PrizeType) || PrizeType.PHYSICAL,
              description: p.description || `${p.position === 1 ? 'Grand' : p.position === 2 ? 'Second' : 'Consolation'} Prize`
            })),
          },
        },
      });

      // 3. Generate tickets automatically (1 to totalTickets)
      const ticketsData = Array.from({ length: data.totalTickets }, (_, i) => ({
        lotteryId: lottery.id,
        ticketNumber: i + 1,
        status: TicketStatus.AVAILABLE,
      }));

      // Bulk create tickets
      await tx.ticket.createMany({
        data: ticketsData,
      });

      return lottery;
    });
  }

  static async getActiveLotteries() {
    return await prisma.lottery.findMany({
      where: {
        status: LotteryStatus.ACTIVE,
      },
      include: {
        prizeDistribution: true,
        agent: {
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: {
            tickets: { where: { status: 'SOLD' } }
          }
        }
      },
    });
  }

  static async getLotteryById(id: string) {
    return await prisma.lottery.findUnique({
      where: { id },
      include: {
        prizeDistribution: true,
        agent: {
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: {
            tickets: { where: { status: 'SOLD' } }
          }
        },
      },
    });
  }

  static async getLotteryTickets(id: string) {
    return await prisma.ticket.findMany({
      where: { lotteryId: id },
      orderBy: { ticketNumber: 'asc' },
    });
  }
}

export class AgentService {
  static async getAgentLotteries(agentId: string) {
    // Find the agent by userId first to get their agent.id
    const agent = await prisma.agent.findUnique({
      where: { userId: agentId },
    });

    if (!agent) throw new Error('Agent profile not found');

    return await prisma.lottery.findMany({
      where: {
        agentId: agent.id,
      },
      include: {
        prizeDistribution: true,
        _count: {
          select: { tickets: true, winners: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getAgentStats(userId: string) {
    const agent = await prisma.agent.findUnique({
      where: { userId: userId },
      include: {
        lotteries: {
          include: {
            _count: {
              select: { tickets: { where: { status: 'SOLD' } } },
            },
          },
        },
      },
    });

    if (!agent) throw new Error('Agent profile not found');

    const activeLotteries = await prisma.lottery.count({
      where: { agentId: agent.id, status: 'ACTIVE' },
    });

    const pendingReservations = await prisma.reservation.count({
      where: { 
        lottery: { agentId: agent.id },
        status: 'PENDING' 
      },
    });

    let totalTicketsSold = 0;
    let totalRevenue = 0;

    agent.lotteries.forEach((l) => {
      // @ts-ignore
      totalTicketsSold += l._count.tickets;
      // @ts-ignore
      totalRevenue += l._count.tickets * l.ticketPrice;
    });

    return {
      activeLotteries,
      ticketsSold: totalTicketsSold,
      pendingReservations,
      totalRevenue,
    };
  }

  static async getAgentWinners(userId: string) {
    const agent = await prisma.agent.findUnique({
      where: { userId: userId },
    });

    if (!agent) throw new Error('Agent profile not found');

    const winners = await prisma.winner.findMany({
      where: {
        lottery: { agentId: agent.id },
      },
      include: {
        lottery: {
          select: { title: true }
        },
        ticket: {
          select: {
            ticketNumber: true,
            status: true,
            reservedBy: true,
          }
        }
      },
      orderBy: { drawnAt: 'desc' },
    });

    return winners;
  }
}
