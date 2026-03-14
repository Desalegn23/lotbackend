import prisma from '../db/prisma.js'; 
import { LotteryStatus, TicketStatus } from '@prisma/client';

export class DrawService {
  static async drawWinners(lotteryId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Get lottery and prize distribution
      const lottery = await tx.lottery.findUnique({
        where: { id: lotteryId },
        include: { prizeDistribution: true },
      });

      if (!lottery || lottery.status !== LotteryStatus.ACTIVE) {
        throw new Error('Lottery not found or not in ACTIVE status');
      }

      // 2. Get all SOLD tickets
      const soldTickets = await tx.ticket.findMany({
        where: {
          lotteryId,
          status: TicketStatus.SOLD,
        },
      });

      if (soldTickets.length === 0) {
        throw new Error('No tickets sold for this lottery');
      }

      // 3. Draw winners randomly
      const prizes = lottery.prizeDistribution.sort((a, b) => a.position - b.position);
      const availableTickets = [...soldTickets];
      const winners = [];

      for (const prize of prizes) {
        if (availableTickets.length === 0) break;

        const randomIndex = Math.floor(Math.random() * availableTickets.length);
        const winningTicket = availableTickets.splice(randomIndex, 1)[0];
        if (!winningTicket) continue;

        winners.push({
          lotteryId,
          ticketId: winningTicket.id,
          prizePosition: prize.position,
          prizeAmount: prize.prizeAmount,
        });
      }

      // 4. Record winners
      await tx.winner.createMany({
        data: winners,
      });

      // 5. Mark lottery as COMPLETED
      await tx.lottery.update({
        where: { id: lotteryId },
        data: { status: LotteryStatus.COMPLETED },
      });

      // 6. Fetch full winner details to return
      return await tx.winner.findMany({
        where: { lotteryId },
        include: { ticket: true },
        orderBy: { prizePosition: 'asc' },
      });
    });
  }

  static async getLotteryWinners(lotteryId: string) {
    return await prisma.winner.findMany({
      where: { lotteryId },
      include: {
        ticket: true,
      },
      orderBy: { prizePosition: 'asc' },
    });
  }
}
