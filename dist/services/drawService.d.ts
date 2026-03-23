export declare class DrawService {
    static drawWinners(lotteryId: string): Promise<({
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