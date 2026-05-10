import prisma from '../db/prisma.js'; 
import { LotteryStatus, TicketStatus } from '@prisma/client';
import { NotificationService } from './notificationService.js';

export class DrawService {
  static async drawWinners(lotteryId: string, agentUserId?: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Get lottery and prize distribution
      const lottery = await tx.lottery.findUnique({
        where: { id: lotteryId },
        include: { 
          prizeDistribution: true,
          agent: true
        },
      });

      if (!lottery) {
        throw new Error('Lottery not found');
      }

      // 1.1 Authorization check (only if agentUserId is provided)
      if (agentUserId && lottery.agent.userId !== agentUserId) {
        throw new Error('Unauthorized: You do not own this lottery');
      }

      // 1.2 If already drawn, return existing winners
      if (lottery.status === LotteryStatus.COMPLETED || lottery.drawn) {
        return await tx.winner.findMany({
          where: { lotteryId },
          include: { 
            ticket: true,
            lottery: {
              include: {
                agent: { include: { user: { select: { name: true } } } }
              }
            }
          },
          orderBy: { prizePosition: 'asc' },
        });
      }

      if (lottery.status !== LotteryStatus.ACTIVE) {
        throw new Error('Lottery is not in ACTIVE status');
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
          prizeType: prize.prizeType,
          description: prize.description,
        });
      }

      // 4. Record winners
      await tx.winner.createMany({
        data: winners,
      });

      // 5. Mark lottery as COMPLETED and record drawn status
      await tx.lottery.update({
        where: { id: lotteryId },
        data: { 
          status: LotteryStatus.COMPLETED,
          drawn: true,
          drawnAt: new Date()
        },
      });

      // 6. Fetch full winner details to return
      const winnerRecords = await tx.winner.findMany({
        where: { lotteryId },
        include: { 
          ticket: true,
          lottery: {
            include: {
              agent: { include: { user: { select: { name: true } } } }
            }
          }
        },
        orderBy: { prizePosition: 'asc' },
      });

      // 7. Send notifications
      try {
        const agentWithUser = await tx.agent.findUnique({
          where: { id: lottery.agentId },
          include: { user: true }
        });

        // Notify each winner individually
        for (const w of winnerRecords) {
          if (!w.ticket.reservedBy) continue;
          const reservationTicket = await tx.reservationTicket.findFirst({
            where: { 
              ticketId: w.ticketId,
              reservation: { status: 'APPROVED' }
            },
            include: { reservation: { include: { user: true } } }
          });

          if (reservationTicket?.reservation?.user?.telegramId) {
             await NotificationService.sendToUser(
               reservationTicket.reservation.user.telegramId,
               `🎉 <b>እንኳን ደስ አለዎት!</b> 🎉\nበ <b>${lottery.title}</b> ዕጣ <b>${w.prizeAmount}</b> አሸንፈዋል! ቲኬት #${w.ticket.ticketNumber}`
             );
          }
        }

        // Notify agent personally
        if (agentWithUser?.user?.telegramId) {
          await NotificationService.sendToUser(
            agentWithUser.user.telegramId,
            `🏆 <b>ዕጣው ተጠናቋል!</b>\nየ <b>${lottery.title}</b> ዕጣ ተከናውኗል። ${winnerRecords.length} አሸናፊ(ዎች) ተለይተዋል።`
          );
        }

        // Broadcast winner announcement to groups
        const winnerList = winnerRecords.map(w =>
          `${w.prizePosition}ኛ — ቲኬት #${w.ticket.ticketNumber} ${w.prizeAmount} አሸንፏል`
        ).join('\n');
        
        const announcement = `🏆 <b>አሸናፊዎች ታውቀዋል!</b> 🏆\n\nየ <b>${lottery.title}</b> ዕጣ ውጤቶች:\n${winnerList}\n\nለአሸናፊዎች እንኳን ደስ አላችሁ! ቀጣዩ ዙር በቅርቡ ይጀምራል።`;
        
        const targetGroupIds = (lottery as any).telegramGroupIds;
        if (targetGroupIds && targetGroupIds.length > 0) {
          for (const gid of targetGroupIds) {
            await NotificationService.sendToGroup(gid, announcement);
          }
        } else {
          await NotificationService.sendToAgentGroups(lottery.agentId, announcement);
        }
      } catch (e) {
        console.error('Failed to send draw notifications', e);
      }

      return winnerRecords;
    });
  }

  static async getLotteryWinners(lotteryId: string) {
    return await prisma.winner.findMany({
      where: { lotteryId },
      include: {
        ticket: true,
        lottery: {
          include: {
            agent: { include: { user: { select: { name: true } } } }
          }
        }
      },
      orderBy: { prizePosition: 'asc' },
    });
  }
}
