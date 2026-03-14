"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawService = void 0;
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const client_1 = require("@prisma/client");
class DrawService {
    static async drawWinners(lotteryId) {
        return await prisma_js_1.default.$transaction(async (tx) => {
            // 1. Get lottery and prize distribution
            const lottery = await tx.lottery.findUnique({
                where: { id: lotteryId },
                include: { prizeDistribution: true },
            });
            if (!lottery || lottery.status !== client_1.LotteryStatus.ACTIVE) {
                throw new Error('Lottery not found or not in ACTIVE status');
            }
            // 2. Get all SOLD tickets
            const soldTickets = await tx.ticket.findMany({
                where: {
                    lotteryId,
                    status: client_1.TicketStatus.SOLD,
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
                });
            }
            // 4. Record winners
            await tx.winner.createMany({
                data: winners,
            });
            // 5. Mark lottery as COMPLETED
            await tx.lottery.update({
                where: { id: lotteryId },
                data: { status: client_1.LotteryStatus.COMPLETED },
            });
            return winners;
        });
    }
    static async getLotteryWinners(lotteryId) {
        return await prisma_js_1.default.winner.findMany({
            where: { lotteryId },
            include: {
                ticket: true,
            },
            orderBy: { prizePosition: 'asc' },
        });
    }
}
exports.DrawService = DrawService;
//# sourceMappingURL=drawService.js.map