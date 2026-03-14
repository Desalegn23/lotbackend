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
    }[]>;
}
//# sourceMappingURL=lotteryService.d.ts.map