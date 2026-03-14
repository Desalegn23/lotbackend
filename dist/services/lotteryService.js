"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LotteryService = void 0;
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const client_1 = require("@prisma/client");
class LotteryService {
    static async createLottery(data) {
        return await prisma_js_1.default.$transaction(async (tx) => {
            // 1. Create the lottery record
            const lottery = await tx.lottery.create({
                data: {
                    agentId: data.agentId,
                    title: data.title,
                    description: data.description,
                    ticketPrice: data.ticketPrice,
                    totalTickets: data.totalTickets,
                    status: client_1.LotteryStatus.DRAFT,
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
                status: client_1.TicketStatus.AVAILABLE,
            }));
            // Bulk create tickets
            await tx.ticket.createMany({
                data: ticketsData,
            });
            return lottery;
        });
    }
    static async getActiveLotteries() {
        return await prisma_js_1.default.lottery.findMany({
            where: {
                status: client_1.LotteryStatus.ACTIVE,
            },
            include: {
                prizeDistribution: true,
            },
        });
    }
    static async getLotteryById(id) {
        return await prisma_js_1.default.lottery.findUnique({
            where: { id },
            include: {
                prizeDistribution: true,
                _count: {
                    select: { tickets: true },
                },
            },
        });
    }
    static async getLotteryTickets(id) {
        return await prisma_js_1.default.ticket.findMany({
            where: { lotteryId: id },
            orderBy: { ticketNumber: 'asc' },
        });
    }
}
exports.LotteryService = LotteryService;
//# sourceMappingURL=lotteryService.js.map