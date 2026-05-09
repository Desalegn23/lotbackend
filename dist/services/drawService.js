import prisma from '../db/prisma.js';
import { LotteryStatus, TicketStatus } from '@prisma/client';
import { NotificationService } from './notificationService.js';
export class DrawService {
    static async drawWinners(lotteryId, agentUserId) {
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
                if (availableTickets.length === 0)
                    break;
                const randomIndex = Math.floor(Math.random() * availableTickets.length);
                const winningTicket = availableTickets.splice(randomIndex, 1)[0];
                if (!winningTicket)
                    continue;
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
                    if (!w.ticket.reservedBy)
                        continue;
                    // Find the user who reserved this ticket
                    const reservationTicket = await tx.reservationTicket.findFirst({
                        where: {
                            ticketId: w.ticketId,
                            reservation: { status: 'APPROVED' }
                        },
                        include: { reservation: { include: { user: true } } }
                    });
                    if (reservationTicket?.reservation?.user?.telegramId) {
                        await NotificationService.sendToUser(reservationTicket.reservation.user.telegramId, `🎉 <b>CONGRATULATIONS!</b> 🎉\nYou won <b>${w.prizeAmount}</b> in the <b>${lottery.title}</b> draw! Ticket #${w.ticket.ticketNumber}`);
                    }
                }
                // Notify agent personally
                if (agentWithUser?.user?.telegramId) {
                    await NotificationService.sendToUser(agentWithUser.user.telegramId, `🏆 <b>Draw Complete!</b>\nThe draw for <b>${lottery.title}</b> is finished. ${winnerRecords.length} winner(s) selected.`);
                }
                // Broadcast winner announcement to agent groups
                const winnerList = winnerRecords.map(w => `#${w.prizePosition} — Ticket #${w.ticket.ticketNumber} wins ${w.prizeAmount}`).join('\n');
                await NotificationService.sendToAgentGroups(lottery.agentId, `🏆 <b>WE HAVE A WINNER!</b> 🏆\n\n<b>${lottery.title}</b> draw results:\n${winnerList}\n\nCongratulations to the winners! Next round starts soon.`);
            }
            catch (e) {
                console.error('Failed to send draw notifications', e);
            }
            return winnerRecords;
        });
    }
    static async getLotteryWinners(lotteryId) {
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
//# sourceMappingURL=drawService.js.map