export declare class DrawService {
    static drawWinners(lotteryId: string): Promise<{
        lotteryId: string;
        ticketId: string;
        prizePosition: number;
        prizeAmount: number;
    }[]>;
    static getLotteryWinners(lotteryId: string): Promise<({
        ticket: {
            id: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            createdAt: Date;
            lotteryId: string;
            ticketNumber: number;
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
//# sourceMappingURL=drawService.d.ts.map