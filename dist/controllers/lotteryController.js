"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LotteryController = void 0;
const lotteryService_js_1 = require("../services/lotteryService.js");
const drawService_js_1 = require("../services/drawService.js");
const response_js_1 = require("../utils/response.js");
/**
 * @openapi
 * components:
 *   schemas:
 *     Lottery:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         ticketPrice:
 *           type: number
 *         totalTickets:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [DRAFT, ACTIVE, COMPLETED]
 */
class LotteryController {
    /**
     * @openapi
     * /api/agent/lotteries:
     *   post:
     *     summary: Create a new lottery (Agent only)
     *     tags: [Lotteries]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *               ticketPrice:
     *                 type: number
     *               totalTickets:
     *                 type: integer
     *               prizes:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     position:
     *                       type: integer
     *                     amount:
     *                       type: number
     *     responses:
     *       201:
     *         description: Lottery created successfully
     *       400:
     *         description: Invalid input
     */
    static async create(req, res) {
        try {
            // @ts-ignore
            const agentId = req.user.id;
            const lottery = await lotteryService_js_1.LotteryService.createLottery({
                ...req.body,
                agentId,
            });
            (0, response_js_1.sendResponse)(res, 201, lottery, 'Lottery created successfully');
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async list(req, res) {
        try {
            const lotteries = await lotteryService_js_1.LotteryService.getActiveLotteries();
            (0, response_js_1.sendResponse)(res, 200, lotteries);
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
    static async getById(req, res) {
        try {
            const lottery = await lotteryService_js_1.LotteryService.getLotteryById(req.params.id);
            if (!lottery)
                return (0, response_js_1.sendError)(res, 404, 'Lottery not found');
            (0, response_js_1.sendResponse)(res, 200, lottery);
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
    static async getTickets(req, res) {
        try {
            const tickets = await lotteryService_js_1.LotteryService.getLotteryTickets(req.params.id);
            (0, response_js_1.sendResponse)(res, 200, tickets);
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
    static async draw(req, res) {
        try {
            const winners = await drawService_js_1.DrawService.drawWinners(req.params.id);
            (0, response_js_1.sendResponse)(res, 200, winners, 'Winners drawn successfully');
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
}
exports.LotteryController = LotteryController;
//# sourceMappingURL=lotteryController.js.map