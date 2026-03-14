export declare class LotteryService {
    static createLottery(data: {
        agentId: string;
        title: string;
        description?: string;
        ticketPrice: number;
        totalTickets: number;
        prizes: {
            position: number;
            amount: number;
        }[];
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LotteryStatus;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        ticketPrice: number;
        totalTickets: number;
        drawn: boolean;
        drawnAt: Date | null;
        agentId: string;
    }>;
    static getActiveLotteries(): Promise<({
        agent: {
            user: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            bankName: string | null;
            accountNumber: string | null;
        };
        _count: {
            tickets: number;
        };
        prizeDistribution: {
            id: string;
            position: number;
            prizeAmount: number;
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
        drawn: boolean;
        drawnAt: Date | null;
        agentId: string;
    })[]>;
    static getLotteryById(id: string): Promise<({
        agent: {
            user: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            bankName: string | null;
            accountNumber: string | null;
        };
        _count: {
            tickets: number;
        };
        prizeDistribution: {
            id: string;
            position: number;
            prizeAmount: number;
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
        drawn: boolean;
        drawnAt: Date | null;
        agentId: string;
    }) | null>;
    static getLotteryTickets(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        lotteryId: string;
        ticketNumber: number;
        reservedBy: string | null;
    }[]>;
}
export declare class AgentService {
    static getAgentLotteries(agentId: string): Promise<({
        _count: {
            tickets: number;
            winners: number;
        };
        prizeDistribution: {
            id: string;
            position: number;
            prizeAmount: number;
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
        drawnAt: Date;
        prizeAmount: number;
        lotteryId: string;
        ticketId: string;
        prizePosition: number;
    })[]>;
}
//# sourceMappingURL=lotteryService.d.ts.map