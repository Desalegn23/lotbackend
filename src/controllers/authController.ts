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

      if (!name || !password || !phone) {
        return sendError(res, 400, 'name, phone and password are required');
      }

      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return sendError(res, 400, 'Email already in use');
        }
      }

      const existingPhone = await prisma.user.findFirst({ where: { phone: phone as string } });
      if (existingPhone) {
        return sendError(res, 400, 'Phone number already in use');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { name, email, phone, password: hashedPassword, role: 'USER' },
      });

      const token = signToken({ id: user.id, role: user.role });

      return sendResponse(res, 201, {
        token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
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
   *             required: [phone, password]
   *             properties:
   *               phone:    { type: string }
   *               password: { type: string }
   *     responses:
   *       200: { description: Login successful, returns JWT token }
   *       400: { description: Invalid credentials }
   *       403: { description: Account is inactive }
   */
  static async login(req: Request, res: Response) {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return sendError(res, 400, 'phone and password are required');
      }

      const user = await prisma.user.findFirst({
        where: { phone },
        include: { agent: true },
      });

      if (!user) {
        return sendError(res, 400, 'Invalid phone or password');
      }

      if (user.status === 'INACTIVE') {
        return sendError(res, 403, 'Your account has been deactivated. Contact an administrator.');
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return sendError(res, 400, 'Invalid phone or password');
      }

      const token = signToken({ id: user.id, role: user.role });

      return sendResponse(res, 200, {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
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
  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return sendError(res, 400, 'Old password and new password are required');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        return sendError(res, 400, 'Invalid old password');
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return sendResponse(res, 200, null, 'Password changed successfully');
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
          telegramId: true,
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
            paymentOptions: true,
            notifyInterval: true,
            notifyThreshold: true,
            notifyLanguage: true,
            customMessage: true,
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
          paymentOptions: true,
          notifyInterval: true,
          notifyThreshold: true,
          notifyLanguage: true,
          customMessage: true,
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
        return sendError(res, 404, 'No account linked to this Telegram profile. Please sign up or login with your phone number first to link your account.');
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
          phone: user.phone,
          role: user.role,
          agentId: user?.agent?.id ?? null,
        },
      }, 'Telegram login successful');
    } catch (error: any) {
      return sendError(res, 500, error.message);
    }
  }

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
  static async linkTelegram(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
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

      const existingLink = await prisma.user.findUnique({ where: { telegramId } });
      if (existingLink && existingLink.id !== userId) {
        return sendError(res, 400, 'This Telegram account is already linked to another user.');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { telegramId },
      });

      return sendResponse(res, 200, {
        user: { id: updatedUser.id, telegramId: updatedUser.telegramId }
      }, 'Telegram account linked successfully');
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

      const { name, email, phone, password } = req.body;
      if (!name || !password || !phone) {
        return sendError(res, 400, 'name, phone and password are required');
      }

      const hashed = await bcrypt.hash(password, 10);
      const admin = await prisma.user.create({
        data: { name, email, phone, password: hashed, role: 'ADMIN' },
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
