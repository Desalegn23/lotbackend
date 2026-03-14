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
     *             required: [email, password]
     *             properties:
     *               email:    { type: string, format: email }
     *               password: { type: string }
     *     responses:
     *       200: { description: Login successful, returns JWT token }
     *       400: { description: Invalid credentials }
     *       403: { description: Account is inactive }
     */
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
     * One-time admin bootstrap — creates the first ADMIN user.
     * Fails if any ADMIN already exists. Remove this route in production.
     */
    static bootstrapAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=authController.d.ts.map