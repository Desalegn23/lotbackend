import prisma from '../db/prisma.js';
import { ReservationStatus, TicketStatus } from '@prisma/client';
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
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    status: ReservationStatus.PENDING,
                    Tickets: {
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
                    Tickets: {
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
                include: { Tickets: true },
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
            const ticketIds = reservation.Tickets.map((rt) => rt.ticketId);
            await tx.ticket.updateMany({
                where: { id: { in: ticketIds } },
                data: { status: TicketStatus.SOLD },
            });
            return true;
        });
    }
    static async rejectReservation(reservationId) {
        return await prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
                include: { Tickets: true },
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
            const ticketIds = reservation.Tickets.map((rt) => rt.ticketId);
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
}
//# sourceMappingURL=reservationService.js.map