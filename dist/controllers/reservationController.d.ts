import { Request, Response } from 'express';
export declare class ReservationController {
    static reserve(req: Request, res: Response): Promise<void>;
    static agentReserve(req: Request, res: Response): Promise<void>;
    static approve(req: Request, res: Response): Promise<void>;
    static reject(req: Request, res: Response): Promise<void>;
    static listMyReservations(req: Request, res: Response): Promise<void>;
    static listUserTickets(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=reservationController.d.ts.map