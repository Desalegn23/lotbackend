"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationService = void 0;
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const client_1 = require("@prisma/client");
class ReservationService {
    static async createPublicReservation(data) {
        return await prisma_js_1.default.$transaction(async (tx) => {
            // 1. Verify tickets are available
            const tickets = await tx.ticket.findMany({
                where: {
                    id: { in: data.ticketIds },
                    lotteryId: data.lotteryId,
                    status: client_1.TicketStatus.AVAILABLE,
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
                    status: client_1.ReservationStatus.PENDING,
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
                    status: client_1.TicketStatus.RESERVED,
                    reservedBy: data.name,
                },
            });
            return reservation;
        });
    }
    static async createAgentReservation(data) {
        return await prisma_js_1.default.$transaction(async (tx) => {
            // 1. Verify tickets are available
            const tickets = await tx.ticket.findMany({
                where: {
                    id: { in: data.ticketIds },
                    lotteryId: data.lotteryId,
                    status: client_1.TicketStatus.AVAILABLE,
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
                    status: client_1.ReservationStatus.APPROVED,
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
                    status: client_1.TicketStatus.SOLD,
                    reservedBy: data.name,
                },
            });
            return reservation;
        });
    }
    static async approveReservation(reservationId) {
        return await prisma_js_1.default.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
                include: { Tickets: true },
            });
            if (!reservation || reservation.status !== client_1.ReservationStatus.PENDING) {
                throw new Error('Invalid reservation or status');
            }
            // Update reservation status
            await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: client_1.ReservationStatus.APPROVED,
                    paymentConfirmed: true,
                },
            });
            // Update tickets to SOLD
            const ticketIds = reservation.Tickets.map((rt) => rt.ticketId);
            await tx.ticket.updateMany({
                where: { id: { in: ticketIds } },
                data: { status: client_1.TicketStatus.SOLD },
            });
            return true;
        });
    }
    static async rejectReservation(reservationId) {
        return await prisma_js_1.default.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
                include: { Tickets: true },
            });
            if (!reservation || reservation.status !== client_1.ReservationStatus.PENDING) {
                throw new Error('Invalid reservation or status');
            }
            // Update reservation status
            await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: client_1.ReservationStatus.REJECTED,
                },
            });
            // Update tickets to AVAILABLE
            const ticketIds = reservation.Tickets.map((rt) => rt.ticketId);
            await tx.ticket.updateMany({
                where: { id: { in: ticketIds } },
                data: {
                    status: client_1.TicketStatus.AVAILABLE,
                    reservedBy: null
                },
            });
            return true;
        });
    }
}
exports.ReservationService = ReservationService;
//# sourceMappingURL=reservationService.js.map