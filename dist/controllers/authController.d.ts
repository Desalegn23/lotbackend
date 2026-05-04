import { Request, Response } from 'express';
export declare class AuthController {
    /**
     * @openapi
     * /api/auth/signup:
     *   post:
     *     summary: Register a new user (public self-signup, role USER)
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name, email, password]
     *             properties:
     *               name:     { type: string }
     *               email:    { type: string, format: email }
     *               phone:    { type: string }
     *               password: { type: string, minLength: 6 }
     *     responses:
     *       201: { description: User registered successfully }
     *       400: { description: Validation error / email already in use }
     */
    static signup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @openapi
     * /api/auth/login:
     *   post:
     *     summary: Login for Admin, Agent, or User
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [phone, password]
     *             properties:
     *               phone:    { type: string }
     *               password: { type: string }
     *     responses:
     *       200: { description: Login successful, returns JWT token }
     *       400: { description: Invalid credentials }
     *       403: { description: Account is inactive }
     */
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @openapi
     * /api/auth/change-password:
     *   post:
     *     summary: Change current user password
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [oldPassword, newPassword]
     *             properties:
     *               oldPassword: { type: string }
     *               newPassword: { type: string, minLength: 6 }
     *     responses:
     *       200: { description: Password changed successfully }
     *       400: { description: Invalid old password }
     *       401: { description: Unauthorized }
     */
    static changePassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @openapi
     * /api/auth/me:
     *   get:
     *     summary: Get current authenticated user profile
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: Current user profile }
     *       401: { description: Unauthorized }
     */
    static me(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @openapi
     * /api/agent/profile:
     *   get:
     *     summary: Get agent profile details
     *     tags: [Agent]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: Agent profile details }
     *       401: { description: Unauthorized }
     *       403: { description: Not an agent }
     *       404: { description: Agent profile not found }
     */
    static getAgentProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @openapi
     * /api/auth/telegram:
     *   post:
     *     summary: Login or Register via Telegram Mini App
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [initData]
     *             properties:
     *               initData: { type: string }
     *     responses:
     *       200: { description: Login successful, returns JWT token }
     *       400: { description: Invalid Telegram initData }
     *       500: { description: Server error }
     */
    static loginWithTelegram(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * @openapi
     * /api/auth/telegram/link:
     *   post:
     *     summary: Link Telegram to an authenticated user
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [initData]
     *             properties:
     *               initData: { type: string }
     *     responses:
     *       200: { description: Telegram linked successfully }
     *       400: { description: Invalid initData or already linked }
     *       401: { description: Unauthorized }
     */
    static linkTelegram(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * One-time admin bootstrap — creates the first ADMIN user.
     * Fails if any ADMIN already exists. Remove this route in production.
     */
    static bootstrapAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=authController.d.ts.map