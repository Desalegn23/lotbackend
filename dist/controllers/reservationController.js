"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationController = void 0;
const reservationService_js_1 = require("../services/reservationService.js");
const response_js_1 = require("../utils/response.js");
class ReservationController {
    static async reserve(req, res) {
        try {
            const reservation = await reservationService_js_1.ReservationService.createPublicReservation(req.body);
            (0, response_js_1.sendResponse)(res, 201, reservation, 'Reservation created successfully');
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async agentReserve(req, res) {
        try {
            // @ts-ignore
            const agentId = req.user.id;
            const reservation = await reservationService_js_1.ReservationService.createAgentReservation({
                ...req.body,
                agentId,
            });
            (0, response_js_1.sendResponse)(res, 201, reservation, 'Agent reservation completed');
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async approve(req, res) {
        try {
            await reservationService_js_1.ReservationService.approveReservation(req.params.id);
            (0, response_js_1.sendResponse)(res, 200, null, 'Reservation approved');
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async reject(req, res) {
        try {
            await reservationService_js_1.ReservationService.rejectReservation(req.params.id);
            (0, response_js_1.sendResponse)(res, 200, null, 'Reservation rejected');
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
}
exports.ReservationController = ReservationController;
//# sourceMappingURL=reservationController.js.map