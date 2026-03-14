import { Request, Response } from "express";
import prisma from "../db/prisma.js";
import { sendResponse, sendError } from "../utils/response.js";
import bcrypt from "bcrypt";

export class AdminController {

  //////////////////////////////
  // AGENTS
  //////////////////////////////

  static async listAgents(req: Request, res: Response) {
    try {

      const agents = await prisma.agent.findMany({
        include: {
          user: true,
          lotteries: true
        }
      });

      sendResponse(res, 200, agents);

    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }


  static async createAgent(req: Request, res: Response) {
    try {
      const { name, email, phone, password, bankName, accountNumber } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return sendError(res, 400, "Email already exists");
      }

      const hashedPassword = await bcrypt.hash(password || "password", 10);

      const agent = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            phone,
            role: "AGENT",
            password: hashedPassword
          }
        });

        return tx.agent.create({
          data: {
            userId: user.id,
            bankName,
            accountNumber
          },
          include: {
            user: true
          }
        });
      });

      sendResponse(res, 201, agent, "Agent created successfully");
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }


  static async updateAgent(req: Request, res: Response) {
    try {
      const { name, email, phone, status, bankName, accountNumber } = req.body;

      const agent = await prisma.agent.update({
        where: { id: String(req.params.id) },
        data: {
          bankName,
          accountNumber,
          user: {
            update: {
              name,
              email,
              phone,
              status
            }
          }
        },
        include: { user: true }
      });

      sendResponse(res, 200, agent, "Agent updated successfully");
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }


  static async deactivateAgent(req: Request, res: Response) {
    try {

      const agent = await prisma.agent.update({
        where: { id: String(req.params.id) },
        data: {
          user: {
            update: {
              status: "INACTIVE"
            }
          }
        },
        include: { user: true }
      });

      sendResponse(res, 200, agent, "Agent deactivated successfully");

    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }


  static async activateAgent(req: Request, res: Response) {
    try {

      const agent = await prisma.agent.update({
        where: { id: String(req.params.id) },
        data: {
          user: {
            update: {
              status: "ACTIVE"
            }
          }
        },
        include: { user: true }
      });

      sendResponse(res, 200, agent, "Agent activated successfully");

    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }


  static async resetAgentPassword(req: Request, res: Response) {
    try {

      const hashedPassword = await bcrypt.hash("password", 10);

      const agent = await prisma.agent.update({
        where: { id: String(req.params.id) },
        data: {
          user: {
            update: {
              password: hashedPassword
            }
          }
        },
        include: { user: true }
      });

      sendResponse(res, 200, agent, "Agent password reset successfully");

    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }


  static async deleteAgent(req: Request, res: Response) {
    try {

      await prisma.$transaction(async (tx) => {

        const agent = await tx.agent.findUnique({
          where: { id: String(req.params.id) }
        });

        if (!agent) throw new Error("Agent not found");

        await tx.agent.delete({
          where: { id: agent.id }
        });

        await tx.user.delete({
          where: { id: agent.userId }
        });

      });

      sendResponse(res, 200, null, "Agent deleted successfully");

    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }


  //////////////////////////////
  // LOTTERIES
  //////////////////////////////

  static async listLotteries(req: Request, res: Response) {
    try {

      const lotteries = await prisma.lottery.findMany({
        include: {
          agent: {
            include: {
              user: true
            }
          },
          prizeDistribution: true
        }
      });

      sendResponse(res, 200, lotteries);

    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }


  //////////////////////////////
  // TICKETS
  //////////////////////////////

  static async listTickets(req: Request, res: Response) {
    try {

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      const tickets = await prisma.ticket.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          lottery: true
        }
      });

      sendResponse(res, 200, tickets);

    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }


  //////////////////////////////
  // WINNERS
  //////////////////////////////

  static async listWinners(req: Request, res: Response) {
    try {

      const winners = await prisma.winner.findMany({
        include: {
          lottery: true,
          ticket: true
        }
      });

      sendResponse(res, 200, winners);

    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }


  //////////////////////////////
  // SYSTEM MONITORING
  //////////////////////////////

  static async monitorSystem(req: Request, res: Response) {
    try {

      const [
        lotteryCount,
        ticketCount,
        winnerCount,
        activeReservations
      ] = await Promise.all([
        prisma.lottery.count(),
        prisma.ticket.count(),
        prisma.winner.count(),
        prisma.reservation.count({
          where: { status: "PENDING" }
        })
      ]);

      sendResponse(res, 200, {
        lotteries: lotteryCount,
        tickets: ticketCount,
        winners: winnerCount,
        pendingReservations: activeReservations
      });

    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }

}