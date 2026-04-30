import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { sendResponse, sendError } from '../utils/response.js';
import { validateWebAppData, parseInitDataUser } from '../utils/telegramAuth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT token for a user
 */
function signToken(payload: { id: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export class AuthController {
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
  static async signup(req: Request, res: Response) {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || !email || !password) {
        return sendError(res, 400, 'name, email and password are required');
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return sendError(res, 400, 'Email already in use');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { name, email, phone, password: hashedPassword, role: 'USER' },
      });

      const token = signToken({ id: user.id, role: user.role });

      return sendResponse(res, 201, {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      }, 'Account created successfully');
    } catch (error: any) {
      return sendError(res, 500, error.message);
    }
  }

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
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 400, 'email and password are required');
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { agent: true },
      });

      if (!user) {
        return sendError(res, 400, 'Invalid email or password');
      }

      if (user.status === 'INACTIVE') {
        return sendError(res, 403, 'Your account has been deactivated. Contact an administrator.');
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return sendError(res, 400, 'Invalid email or password');
      }

      const token = signToken({ id: user.id, role: user.role });

      return sendResponse(res, 200, {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          agentId: user.agent?.id ?? null,
        },
      }, 'Login successful');
    } catch (error: any) {
      return sendError(res, 500, error.message);
    }
  }

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
  static async me(req: Request, res: Response) {
    try {
      // req.user is attached by the authenticate middleware
      const userId = (req as any).user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          agent: { select: { id: true } },
        },
      });

      if (!user) return sendError(res, 404, 'User not found');

      // If user is an agent, include agent profile details
      if (user.role === 'AGENT') {
        const agentProfile = await prisma.agent.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
                status: true,
              }
            },
            bankName: true,
            accountNumber: true,
            createdAt: true,
          },
        });

        return sendResponse(res, 200, {
          ...user,
          agent: agentProfile,
        });
      }

      return sendResponse(res, 200, user);
    } catch (error: any) {
      return sendError(res, 500, error.message);
    }
  }

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
  static async getAgentProfile(req: Request, res: Response) {
    try {
      // req.user is attached by the authenticate middleware
      const userId = (req as any).user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'AGENT') {
        return sendError(res, 403, 'Access denied. Agent role required.');
      }

      const agentProfile = await prisma.agent.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              status: true,
            }
          },
          bankName: true,
          accountNumber: true,
          createdAt: true,
        },
      });

      if (!agentProfile) {
        return sendError(res, 404, 'Agent profile not found.');
      }

      return sendResponse(res, 200, agentProfile);
    } catch (error: any) {
      return sendError(res, 500, error.message);
    }
  }

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
  static async loginWithTelegram(req: Request, res: Response) {
    try {
      const { initData } = req.body;
      if (!initData) {
        return sendError(res, 400, 'initData is required');
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN is not configured');
        return sendError(res, 500, 'Telegram auth is not configured');
      }

      const isValid = validateWebAppData(initData, botToken);
      if (!isValid) {
        return sendError(res, 400, 'Invalid Telegram initData');
      }

      const tgUser = parseInitDataUser(initData);
      if (!tgUser || !tgUser.id) {
        return sendError(res, 400, 'User data missing in initData');
      }

      const telegramId = tgUser.id.toString();

      // Find user by telegramId
      let user = await prisma.user.findUnique({
        where: { telegramId },
        include: { agent: true },
      });

      if (!user) {
        // Automatically create a new user account if not found
        // Generates a random password since they login via Telegram
        const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
        
        // Use a generated email since telegram might not provide one
        const generatedEmail = `tg_${telegramId}@telegram.local`;
        
        const firstName = tgUser.first_name || '';
        const lastName = tgUser.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || tgUser.username || `User ${telegramId}`;

        user = await prisma.user.create({
          data: {
            telegramId,
            name,
            email: generatedEmail,
            password: hashedPassword,
            role: 'USER',
          },
          include: { agent: true },
        });
      }

      if (user.status === 'INACTIVE') {
        return sendError(res, 403, 'Your account has been deactivated. Contact an administrator.');
      }

      const token = signToken({ id: user.id, role: user.role });

      return sendResponse(res, 200, {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          agentId: user?.agent?.id ?? null,
        },
      }, 'Telegram login successful');
    } catch (error: any) {
      return sendError(res, 500, error.message);
    }
  }

  /**
   * One-time admin bootstrap — creates the first ADMIN user.
   * Fails if any ADMIN already exists. Remove this route in production.
   */
  static async bootstrapAdmin(req: Request, res: Response) {
    try {
      const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (existingAdmin) {
        return sendError(res, 400, 'An admin account already exists.');
      }

      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return sendError(res, 400, 'name, email and password are required');
      }

      const hashed = await bcrypt.hash(password, 10);
      const admin = await prisma.user.create({
        data: { name, email, password: hashed, role: 'ADMIN' },
      });

      const token = signToken({ id: admin.id, role: admin.role });
      return sendResponse(res, 201, {
        token,
        user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      }, 'Admin account created successfully');
    } catch (error: any) {
      return sendError(res, 500, error.message);
    }
  }
}
