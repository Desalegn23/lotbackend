export declare class DrawService {
    static drawWinners(lotteryId: string, agentUserId?: string): Promise<({
        lottery: {
            agent: {
                user: {
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string;
                commissionRate: number;
                notifyInterval: string;
                notifyThreshold: number;
                notifyLanguage: string;
                notifyShowHolders: boolean;
                customMessage: string | null;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.LotteryStatus;
            createdAt: Date;
            updatedAt: Date;
            notifyInterval: string | null;
            notifyThreshold: number | null;
            notifyLanguage: string | null;
            notifyShowHolders: boolean | null;
            customMessage: string | null;
            title: string;
            description: string | null;
            ticketPrice: number;
            totalTickets: number;
            category: string;
            image: string | null;
            drawn: boolean;
            drawnAt: Date | null;
            agentId: string;
        };
        ticket: {
            id: string;
            status: import("@prisma/client").$Enums.TicketStatus;
            createdAt: Date;
            lotteryId: string;
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
    static getLotteryWinners(lotteryId: string): Promise<({
        lottery: {
            agent: {
                user: {
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string;
                commissionRate: number;
                notifyInterval: string;
                notifyThreshold: number;
                notifyLanguage: string;
                notifyShowHolders: boolean;
                customMessage: string | null;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.LotteryStatus;
            createdAt: Date;
            updatedAt: Date;
            notifyInterval: string | null;
            notifyThreshold: number | null;
            notifyLanguage: string | null;
            notifyShowHolders: boolean | null;
            customMessage: string | null;
            title: string;
            description: string | null;
            ticketPrice: number;
            totalTickets: number;
            category: string;
            image: string | null;
            drawn: boolean;
            drawnAt: Date | null;
            agentId: string;
        };
        ticket: {
            id: string;
            status: import("@prisma/client").$Enums.TicketStatus;
            createdAt: Date;
            lotteryId: string;
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
//# sourceMappingURL=drawService.d.ts.map