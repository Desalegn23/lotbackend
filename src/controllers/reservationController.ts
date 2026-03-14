import { Request, Response } from 'express';
import { ReservationService } from '../services/reservationService.js';
import { sendResponse, sendError } from '../utils/response.js';

export class ReservationController {
  static async reserve(req: Request, res: Response) {
    try {
      const reservation = await ReservationService.createPublicReservation(req.body);
      sendResponse(res, 201, reservation, 'Reservation created successfully');
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }

  static async agentReserve(req: Request, res: Response) {
    try {
      // @ts-ignore
      const agentId = req.user.id;
      const reservation = await ReservationService.createAgentReservation({
        ...req.body,
        agentId,
      });
      sendResponse(res, 201, reservation, 'Agent reservation completed');
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      await ReservationService.approveReservation(req.params.id as string);
      sendResponse(res, 200, null, 'Reservation approved');
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      await ReservationService.rejectReservation(req.params.id as string);
      sendResponse(res, 200, null, 'Reservation rejected');
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }

  static async listMyReservations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const reservations = await ReservationService.getAgentReservations(userId);
      sendResponse(res, 200, reservations);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }
}
