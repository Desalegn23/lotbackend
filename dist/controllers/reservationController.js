import { ReservationService } from '../services/reservationService.js';
import { sendResponse, sendError } from '../utils/response.js';
export class ReservationController {
    static async reserve(req, res) {
        try {
            const reservation = await ReservationService.createPublicReservation(req.body);
            sendResponse(res, 201, reservation, 'Reservation created successfully');
        }
        catch (error) {
            sendError(res, 400, error.message);
        }
    }
    static async agentReserve(req, res) {
        try {
            // @ts-ignore
            const agentId = req.user.id;
            const reservation = await ReservationService.createAgentReservation({
                ...req.body,
                agentId,
            });
            sendResponse(res, 201, reservation, 'Agent reservation completed');
        }
        catch (error) {
            sendError(res, 400, error.message);
        }
    }
    static async approve(req, res) {
        try {
            await ReservationService.approveReservation(req.params.id);
            sendResponse(res, 200, null, 'Reservation approved');
        }
        catch (error) {
            sendError(res, 400, error.message);
        }
    }
    static async reject(req, res) {
        try {
            await ReservationService.rejectReservation(req.params.id);
            sendResponse(res, 200, null, 'Reservation rejected');
        }
        catch (error) {
            sendError(res, 400, error.message);
        }
    }
    static async listMyReservations(req, res) {
        try {
            const userId = req.user.id;
            const reservations = await ReservationService.getAgentReservations(userId);
            sendResponse(res, 200, reservations);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
}
//# sourceMappingURL=reservationController.js.map