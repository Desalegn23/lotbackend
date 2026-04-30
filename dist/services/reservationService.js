import prisma from '../db/prisma.js';
import { ReservationStatus, TicketStatus } from '@prisma/client';
import { NotificationService } from './notificationService.js';
export class ReservationService {
    static async createPublicReservation(data) {
        return await prisma.$transaction(async (tx) => {
            // 1. Verify tickets are available
            const tickets = await tx.ticket.findMany({
                where: {
                    id: { in: data.ticketIds },
                    lotteryId: data.lotteryId,
                    status: TicketStatus.AVAILABLE,
                },
            });
            if (tickets.length !== data.ticketIds.length) {
                throw new Error('Some tickets are no longer available or do not exist');
            }
            // 2. Create reservation
            const reservation = await tx.reservation.create({
                data: {
                    lotteryId: data.lotteryId,
                    userId: data.userId,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    status: ReservationStatus.PENDING,
                    tickets: {
                        create: data.ticketIds.map((id) => ({
                            ticketId: id,
                        })),
                    },
                },
            });
            // 3. Update tickets to RESERVED
            await tx.ticket.updateMany({
                where: {
                    id: { in: data.ticketIds },
                },
                data: {
                    status: TicketStatus.RESERVED,
                    reservedBy: data.name,
                },
            });
            // 4. Send notifications
            try {
                const lottery = await tx.lottery.findUnique({
                    where: { id: data.lotteryId },
                    include: { agent: { include: { user: true } } }
                });
                // Notify the customer (if logged in and has Telegram linked)
                if (data.userId) {
                    const customer = await tx.user.findUnique({ where: { id: data.userId } });
                    if (customer?.telegramId && lottery) {
                        await NotificationService.sendToUser(customer.telegramId, `🎟️ <b>Ticket Reserved!</b>\nLottery: ${lottery.title}\nTickets: ${data.ticketIds.length}\nStatus: Pending Payment`);
                    }
                }
                // Notify the agent
                if (lottery?.agent?.user?.telegramId) {
                    await NotificationService.sendToUser(lottery.agent.user.telegramId, `🔔 <b>New Reservation!</b>\nUser ${data.name} reserved ${data.ticketIds.length} ticket(s) on ${lottery.title}.`);
                }
            }
            catch (e) {
                console.error('Failed to send reservation notification', e);
            }
            return reservation;
        });
    }
    static async createAgentReservation(data) {
        return await prisma.$transaction(async (tx) => {
            // 1. Verify tickets are available
            const tickets = await tx.ticket.findMany({
                where: {
                    id: { in: data.ticketIds },
                    lotteryId: data.lotteryId,
                    status: TicketStatus.AVAILABLE,
                },
            });
            if (tickets.length !== data.ticketIds.length) {
                throw new Error('Some tickets are no longer available');
            }
            // 2. Create reservation (automatically APPROVED for agents)
            const reservation = await tx.reservation.create({
                data: {
                    lotteryId: data.lotteryId,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    status: ReservationStatus.APPROVED,
                    reservedByAgent: true,
                    paymentConfirmed: true,
                    tickets: {
                        create: data.ticketIds.map((id) => ({
                            ticketId: id,
                        })),
                    },
                },
            });
            // 3. Update tickets to SOLD
            await tx.ticket.updateMany({
                where: {
                    id: { in: data.ticketIds },
                },
                data: {
                    status: TicketStatus.SOLD,
                    reservedBy: data.name,
                },
            });
            return reservation;
        });
    }
    static async approveReservation(reservationId) {
        return await prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
                include: { tickets: true },
            });
            if (!reservation || reservation.status !== ReservationStatus.PENDING) {
                throw new Error('Invalid reservation or status');
            }
            // Update reservation status
            await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: ReservationStatus.APPROVED,
                    paymentConfirmed: true,
                },
            });
            // Update tickets to SOLD
            const ticketIds = reservation.tickets.map((rt) => rt.ticketId);
            await tx.ticket.updateMany({
                where: { id: { in: ticketIds } },
                data: { status: TicketStatus.SOLD },
            });
            // 3. Notification
            try {
                const resWithDetails = await tx.reservation.findUnique({
                    where: { id: reservationId },
                    include: { user: true, lottery: true, tickets: { include: { ticket: true } } }
                });
                if (resWithDetails?.user?.telegramId) {
                    const tNums = resWithDetails.tickets.map((t) => t.ticket.ticketNumber).join(', ');
                    await NotificationService.sendToUser(resWithDetails.user.telegramId, `✅ <b>Payment Confirmed!</b>\nYour tickets #${tNums} for ${resWithDetails.lottery.title} are locked in. Good luck!`);
                }
            }
            catch (e) {
                console.error('Failed to send approval notification', e);
            }
            return true;
        });
    }
    static async rejectReservation(reservationId) {
        return await prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
                include: { tickets: true },
            });
            if (!reservation || reservation.status !== ReservationStatus.PENDING) {
                throw new Error('Invalid reservation or status');
            }
            // Update reservation status
            await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: ReservationStatus.REJECTED,
                },
            });
            // Update tickets to AVAILABLE
            const ticketIds = reservation.tickets.map((rt) => rt.ticketId);
            await tx.ticket.updateMany({
                where: { id: { in: ticketIds } },
                data: {
                    status: TicketStatus.AVAILABLE,
                    reservedBy: null
                },
            });
            return true;
        });
    }
    static async getAgentReservations(userId) {
        const agent = await prisma.agent.findUnique({
            where: { userId: userId },
        });
        if (!agent)
            throw new Error('Agent profile not found');
        return await prisma.reservation.findMany({
            where: {
                lottery: { agentId: agent.id },
            },
            include: {
                lottery: {
                    select: { title: true }
                },
                tickets: {
                    include: {
                        ticket: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async getUserReservations(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, phone: true }
        });
        if (!user)
            throw new Error('User not found');
        // 1. Find all reservations belonging to this user
        // Include those where userId matches OR (no userId but email/phone matches)
        const reservations = await prisma.reservation.findMany({
            where: {
                OR: [
                    { userId: userId },
                    {
                        userId: null,
                        OR: [
                            { email: user.email },
                            user.phone ? { phone: user.phone } : {}
                        ].filter(cond => Object.keys(cond).length > 0)
                    }
                ]
            },
            include: {
                lottery: {
                    select: { title: true }
                },
                tickets: {
                    include: {
                        ticket: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        // 2. Auto-link unlinked reservations to this user for future efficiency
        const unlinkedIds = reservations
            .filter(r => !r.userId)
            .map(r => r.id);
        if (unlinkedIds.length > 0) {
            await prisma.reservation.updateMany({
                where: { id: { in: unlinkedIds } },
                data: { userId: userId }
            });
        }
        return reservations;
    }
}
//# sourceMappingURL=reservationService.js.map