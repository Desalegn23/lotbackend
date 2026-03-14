import prisma from '../db/prisma.js';
import { LotteryStatus, TicketStatus } from '@prisma/client';

export class LotteryService {
  static async createLottery(data: {
    agentId: string;
    title: string;
    description?: string;
    ticketPrice: number;
    totalTickets: number;
    prizes: { position: number; amount: number }[];
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the lottery record
      const lottery = await tx.lottery.create({
        data: {
          agentId: data.agentId,
          title: data.title,
          description: data.description,
          ticketPrice: data.ticketPrice,
          totalTickets: data.totalTickets,
          status: LotteryStatus.DRAFT,
          prizeDistribution: {
            create: data.prizes.map((p) => ({
              position: p.position,
              prizeAmount: p.amount,
            })),
          },
        },
      });

      // 2. Generate tickets automatically (1 to totalTickets)
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
      },
    });
  }

  static async getLotteryById(id: string) {
    return await prisma.lottery.findUnique({
      where: { id },
      include: {
        prizeDistribution: true,
        _count: {
          select: { tickets: true },
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
