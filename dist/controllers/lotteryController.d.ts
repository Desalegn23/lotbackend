import { Request, Response } from 'express';
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
export declare class LotteryController {
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
    static create(req: Request, res: Response): Promise<void>;
    static list(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getTickets(req: Request, res: Response): Promise<void>;
    static draw(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=lotteryController.d.ts.map