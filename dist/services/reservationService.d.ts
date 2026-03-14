export declare class ReservationService {
    static createPublicReservation(data: {
        lotteryId: string;
        name: string;
        email: string;
        phone: string;
        ticketIds: string[];
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
}
//# sourceMappingURL=reservationService.d.ts.map