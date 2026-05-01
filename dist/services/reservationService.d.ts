export declare class ReservationService {
    private static validateReservationData;
    static createPublicReservation(data: {
        lotteryId: string;
        name: string;
        email: string;
        phone: string;
        ticketIds: string[];
        userId?: string;
    }): Promise<any>;
    static createAgentReservation(data: {
        lotteryId: string;
        agentId: string;
        name: string;
        email: string;
        phone: string;
        ticketIds: string[];
    }): Promise<any>;
    static approveReservation(reservationId: string): Promise<boolean>;
    static rejectReservation(reservationId: string): Promise<boolean>;
    static getAgentReservations(userId: string): Promise<({
        lottery: {
            title: string;
            ticketPrice: number;
        };
        tickets: ({
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
            ticketId: string;
            reservationId: string;
        })[];
    } & {
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
    })[]>;
    static getUserReservations(userId: string): Promise<({
        lottery: {
            title: string;
        };
        tickets: ({
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
            ticketId: string;
            reservationId: string;
        })[];
    } & {
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
    })[]>;
}
//# sourceMappingURL=reservationService.d.ts.map