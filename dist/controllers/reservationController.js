import { ReservationService } from '../services/reservationService.js';
import { sendResponse, sendError } from '../utils/response.js';
import { NotificationService } from '../services/notificationService.js';
export class ReservationController {
    static async reserve(req, res) {
        try {
            const userId = req.user?.id;
            const reservation = await ReservationService.createPublicReservation({
                ...req.body,
                userId
            });
            // Notify agent about new reservation
            NotificationService.notifyReservationCreated(reservation.id).catch(console.error);
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
            const reservationId = req.params.id;
            await ReservationService.approveReservation(reservationId);
            // Notify user about approval
            NotificationService.notifyReservationApproved(reservationId).catch(console.error);
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
    static async listUserTickets(req, res) {
        try {
            const userId = req.user.id;
            const reservations = await ReservationService.getUserReservations(userId);
            sendResponse(res, 200, reservations);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
}
//# sourceMappingURL=reservationController.js.map