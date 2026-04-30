import prisma from '../db/prisma.js';
import { LotteryStatus, TicketStatus, PrizeType } from '@prisma/client';
export class LotteryService {
    static async createLottery(data) {
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
                    category: data.category,
                    status: data.status || LotteryStatus.ACTIVE, // Use provided status or default to ACTIVE
                    prizeDistribution: {
                        create: data.prizes.map((p) => ({
                            position: p.position,
                            prizeAmount: p.amount.toString(), // Convert to string
                            prizeType: p.prizeType || PrizeType.PHYSICAL,
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
    static async getLotteryById(id) {
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
    static async getLotteryTickets(id) {
        return await prisma.ticket.findMany({
            where: { lotteryId: id },
            orderBy: { ticketNumber: 'asc' },
        });
    }
}
export class AgentService {
    static async getAgentLotteries(agentId) {
        const agent = await prisma.agent.findUnique({
            where: { userId: agentId },
        });
        if (!agent)
            throw new Error('Agent profile not found');
        return await prisma.lottery.findMany({
            where: {
                agentId: agent.id,
            },
            include: {
                prizeDistribution: true,
                _count: {
                    select: {
                        tickets: { where: { status: 'SOLD' } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async getAgentStats(userId) {
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
        if (!agent)
            throw new Error('Agent profile not found');
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
    static async getAgentWinners(userId) {
        const agent = await prisma.agent.findUnique({
            where: { userId: userId },
        });
        if (!agent)
            throw new Error('Agent profile not found');
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
    static async getAgentLotteryWinners(userId, lotteryId) {
        const agent = await prisma.agent.findUnique({
            where: { userId: userId },
        });
        if (!agent)
            throw new Error('Agent profile not found');
        const lottery = await prisma.lottery.findFirst({
            where: { id: lotteryId, agentId: agent.id }
        });
        if (!lottery)
            throw new Error('Lottery not found or access denied');
        return await prisma.winner.findMany({
            where: { lotteryId: lotteryId },
            include: {
                ticket: {
                    select: {
                        ticketNumber: true,
                        status: true,
                        reservedBy: true,
                    }
                }
            },
            orderBy: { prizePosition: 'asc' },
        });
    }
    static async getAgentLotteryTickets(userId, lotteryId) {
        const agent = await prisma.agent.findUnique({
            where: { userId: userId },
        });
        if (!agent)
            throw new Error('Agent profile not found');
        const lottery = await prisma.lottery.findFirst({
            where: { id: lotteryId, agentId: agent.id }
        });
        if (!lottery)
            throw new Error('Lottery not found or access denied');
        return await prisma.ticket.findMany({
            where: { lotteryId: lotteryId },
            orderBy: { ticketNumber: 'asc' },
            include: {
                reservationTickets: {
                    include: {
                        reservation: true
                    },
                    where: {
                        reservation: {
                            status: { in: ['PENDING', 'APPROVED'] }
                        }
                    },
                    take: 1
                }
            }
        });
    }
}
//# sourceMappingURL=lotteryService.js.map