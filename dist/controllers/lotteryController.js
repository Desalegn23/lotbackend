import { LotteryService } from '../services/lotteryService.js';
import { DrawService } from '../services/drawService.js';
import { sendResponse, sendError } from '../utils/response.js';
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
export class LotteryController {
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
            // req.user.id is the User model's ID
            const userId = req.user.id;
            const lottery = await LotteryService.createLottery({
                ...req.body,
                agentId: userId, // The service will look up agent by userId
            });
            sendResponse(res, 201, lottery, 'Lottery created successfully');
        }
        catch (error) {
            sendError(res, 400, error.message);
        }
    }
    static async list(req, res) {
        try {
            const lotteries = await LotteryService.getActiveLotteries();
            sendResponse(res, 200, lotteries);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
    static async getById(req, res) {
        try {
            const lottery = await LotteryService.getLotteryById(req.params.id);
            if (!lottery)
                return sendError(res, 404, 'Lottery not found');
            sendResponse(res, 200, lottery);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
    static async getTickets(req, res) {
        try {
            const tickets = await LotteryService.getLotteryTickets(req.params.id);
            sendResponse(res, 200, tickets);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
    static async draw(req, res) {
        try {
            const winners = await DrawService.drawWinners(req.params.id);
            sendResponse(res, 200, winners, 'Winners drawn successfully');
        }
        catch (error) {
            sendError(res, 400, error.message);
        }
    }
    static async listMyLotteries(req, res) {
        try {
            const userId = req.user.id;
            // @ts-ignore
            const { AgentService } = await import('../services/lotteryService.js');
            const lotteries = await AgentService.getAgentLotteries(userId);
            sendResponse(res, 200, lotteries);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
    static async getMyStats(req, res) {
        try {
            const userId = req.user.id;
            // @ts-ignore
            const { AgentService } = await import('../services/lotteryService.js');
            const stats = await AgentService.getAgentStats(userId);
            sendResponse(res, 200, stats);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
    static async listMyWinners(req, res) {
        try {
            const userId = req.user.id;
            // @ts-ignore
            const { AgentService } = await import('../services/lotteryService.js');
            const winners = await AgentService.getAgentWinners(userId);
            sendResponse(res, 200, winners);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
    static async getMyLotteryTickets(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            // @ts-ignore
            const { AgentService } = await import('../services/lotteryService.js');
            const tickets = await AgentService.getAgentLotteryTickets(userId, String(id));
            const mappedTickets = tickets.map((t) => ({
                id: t.id,
                ticketNumber: t.ticketNumber,
                status: t.status,
                reservedBy: t.reservedBy,
                holderInfo: t.reservationTickets[0]?.reservation ? {
                    name: t.reservationTickets[0].reservation.name,
                    email: t.reservationTickets[0].reservation.email,
                    phone: t.reservationTickets[0].reservation.phone,
                    status: t.reservationTickets[0].reservation.status
                } : null
            }));
            sendResponse(res, 200, mappedTickets);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
    static async getMyLotteryWinners(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            // @ts-ignore
            const { AgentService } = await import('../services/lotteryService.js');
            const winners = await AgentService.getAgentLotteryWinners(userId, String(id));
            const mappedWinners = winners.map((w) => ({
                id: w.id,
                prizePosition: w.prizePosition,
                prizeAmount: w.prizeAmount,
                ticketNumber: w.ticket.ticketNumber,
                drawnAt: w.drawnAt,
                description: w.description
            }));
            sendResponse(res, 200, mappedWinners);
        }
        catch (error) {
            sendError(res, 500, error.message);
        }
    }
}
//# sourceMappingURL=lotteryController.js.map