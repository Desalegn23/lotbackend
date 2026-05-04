import { LotteryStatus } from '@prisma/client';
export declare class LotteryService {
    static createLottery(data: {
        agentId: string;
        title: string;
        description: string;
        ticketPrice: number;
        totalTickets: number;
        category: string;
        status?: LotteryStatus;
        prizes: {
            position: number;
            amount: string | number;
            prizeType?: string;
            description?: string;
        }[];
    }): Promise<{
        prizeDistribution: {
            id: string;
            description: string | null;
            position: number;
            prizeAmount: string;
            prizeType: import("@prisma/client").$Enums.PrizeType | null;
            lotteryId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LotteryStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        ticketPrice: number;
        totalTickets: number;
        category: string;
        image: string | null;
        drawn: boolean;
        drawnAt: Date | null;
        agentId: string;
    }>;
    static getActiveLotteries(): Promise<{
        uniqueParticipantCount: number;
        agent: {
            user: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            accountNumber: string | null;
            bankName: string | null;
            commissionRate: number;
            notifyInterval: string;
            notifyThreshold: number;
            notifyLanguage: string;
            customMessage: string | null;
        };
        _count: {
            reservations: number;
            tickets: number;
        };
        prizeDistribution: {
            id: string;
            description: string | null;
            position: number;
            prizeAmount: string;
            prizeType: import("@prisma/client").$Enums.PrizeType | null;
            lotteryId: string;
        }[];
        id: string;
        status: import("@prisma/client").$Enums.LotteryStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        ticketPrice: number;
        totalTickets: number;
        category: string;
        image: string | null;
        drawn: boolean;
        drawnAt: Date | null;
        agentId: string;
    }[]>;
    static getLotteryById(id: string): Promise<{
        uniqueParticipantCount: number;
        agent: {
            user: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            accountNumber: string | null;
            bankName: string | null;
            commissionRate: number;
            notifyInterval: string;
            notifyThreshold: number;
            notifyLanguage: string;
            customMessage: string | null;
        };
        _count: {
            reservations: number;
            tickets: number;
        };
        prizeDistribution: {
            id: string;
            description: string | null;
            position: number;
            prizeAmount: string;
            prizeType: import("@prisma/client").$Enums.PrizeType | null;
            lotteryId: string;
        }[];
        id: string;
        status: import("@prisma/client").$Enums.LotteryStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        ticketPrice: number;
        totalTickets: number;
        category: string;
        image: string | null;
        drawn: boolean;
        drawnAt: Date | null;
        agentId: string;
    } | null>;
    static getLotteryTickets(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        lotteryId: string;
        ticketNumber: number;
        reservedBy: string | null;
    }[]>;
    static getWinners(): Promise<({
        lottery: {
            agent: {
                user: {
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string;
                accountNumber: string | null;
                bankName: string | null;
                commissionRate: number;
                notifyInterval: string;
                notifyThreshold: number;
                notifyLanguage: string;
                customMessage: string | null;
            };
            title: string;
        };
        ticket: {
            ticketNumber: number;
            reservedBy: string | null;
        };
    } & {
        id: string;
        description: string | null;
        drawnAt: Date;
        prizeAmount: string;
        prizeType: import("@prisma/client").$Enums.PrizeType | null;
        lotteryId: string;
        ticketId: string;
        prizePosition: number;
    })[]>;
}
export declare class AgentService {
    static getAgentLotteries(agentId: string): Promise<({
        _count: {
            tickets: number;
        };
        prizeDistribution: {
            id: string;
            description: string | null;
            position: number;
            prizeAmount: string;
            prizeType: import("@prisma/client").$Enums.PrizeType | null;
            lotteryId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LotteryStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        ticketPrice: number;
        totalTickets: number;
        category: string;
        image: string | null;
        drawn: boolean;
        drawnAt: Date | null;
        agentId: string;
    })[]>;
    static getAgentStats(userId: string): Promise<{
        activeLotteries: number;
        ticketsSold: number;
        pendingReservations: number;
        totalRevenue: number;
    }>;
    static getAgentWinners(userId: string): Promise<({
        lottery: {
            title: string;
        };
        ticket: {
            status: import("@prisma/client").$Enums.TicketStatus;
            ticketNumber: number;
            reservedBy: string | null;
        };
    } & {
        id: string;
        description: string | null;
        drawnAt: Date;
        prizeAmount: string;
        prizeType: import("@prisma/client").$Enums.PrizeType | null;
        lotteryId: string;
        ticketId: string;
        prizePosition: number;
    })[]>;
    static getAgentLotteryWinners(userId: string, lotteryId: string): Promise<({
        ticket: {
            status: import("@prisma/client").$Enums.TicketStatus;
            ticketNumber: number;
            reservedBy: string | null;
        };
    } & {
        id: string;
        description: string | null;
        drawnAt: Date;
        prizeAmount: string;
        prizeType: import("@prisma/client").$Enums.PrizeType | null;
        lotteryId: string;
        ticketId: string;
        prizePosition: number;
    })[]>;
    static getAgentLotteryTickets(userId: string, lotteryId: string): Promise<({
        reservationTickets: ({
            reservation: {
                name: string;
                email: string | null;
                phone: string;
                id: string;
                status: import("@prisma/client").$Enums.ReservationStatus;
                createdAt: Date;
                updatedAt: Date;
                userId: string | null;
                lotteryId: string;
                reservedByAgent: boolean;
                paymentConfirmed: boolean;
            };
        } & {
            id: string;
            ticketId: string;
            reservationId: string;
        })[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        lotteryId: string;
        ticketNumber: number;
        reservedBy: string | null;
    })[]>;
}
//# sourceMappingURL=lotteryService.d.ts.map