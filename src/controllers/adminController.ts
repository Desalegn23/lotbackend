import { Request, Response } from "express";
import prisma from "../db/prisma.js";
import { sendResponse, sendError } from "../utils/response.js";
import bcrypt from "bcrypt";
import { AdminService } from "../services/adminService.js";

interface Winner {
  prizeAmount: number;
}

interface LotteryWithWinners {
  ticketPrice: number;
  totalTickets: number;
  winners: Winner[];
}

export class AdminController {
  
  private static mapAgentResponse(a: any) {
    let revenue = 0;
    if (a.lotteries) {
      a.lotteries.forEach((l: any) => {
        const prizeTotal = l.winners ? l.winners.reduce((s: number, w: any) => s + (w.prizeAmount || 0), 0) : 0;
        revenue += (l.ticketPrice * l.totalTickets) - prizeTotal;
      });
    }

    return {
      id: a.id,
      name: a.user.name,
      email: a.user.email,
      phone: a.user.phone || '',
      status: a.user.status,
      bankName: a.bankName || '',
      accountNumber: a.accountNumber || '',
      totalLotteries: a.lotteries ? a.lotteries.length : 0,
      revenueGenerated: revenue,
      createdAt: a.user.createdAt || a.createdAt
    };
  }

  static async listAgents(req: Request, res: Response) {
    try {
      const agents = await prisma.agent.findMany({
        include: {
          user: true,
          lotteries: {
            include: {
              winners: true
            }
          }
        }
      });

      const mappedAgents = agents.map(a => AdminController.mapAgentResponse(a));
      sendResponse(res, 200, mappedAgents);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }

  static async getAgentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agent = await prisma.agent.findUnique({
        where: { id: String(id) },
        include: {
          user: true,
          lotteries: {
            include: {
              winners: true,
              prizeDistribution: true,
              _count: {
                select: { tickets: { where: { status: 'SOLD' } } }
              }
            }
          }
        }
      });

      if (!agent) return sendError(res, 404, "Agent not found");

      const baseMapped = AdminController.mapAgentResponse(agent);
      
      const mappedAgent = {
        ...baseMapped,
        lotteries: (agent as any).lotteries.map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          ticketPrice: l.ticketPrice,
          totalTickets: l.totalTickets,
          soldTickets: l._count.tickets,
          status: l.status,
          createdAt: l.createdAt,
          prizes: l.prizeDistribution.map((p: any) => ({
            rank: p.position,
            amount: p.prizeAmount,
            description: `Rank ${p.position}`
          }))
        }))
      };

      sendResponse(res, 200, mappedAgent);
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
            phone: String(phone || ''),
            role: "AGENT",
            password: hashedPassword
          }
        });

        return tx.agent.create({
          data: {
            userId: user.id,
            bankName: String(bankName || ''),
            accountNumber: String(accountNumber || '')
          },
          include: {
            user: true
          }
        });
      });

      const mappedAgent = AdminController.mapAgentResponse(agent);
      sendResponse(res, 201, mappedAgent, "Agent created successfully");
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
          bankName: String(bankName || ''),
          accountNumber: String(accountNumber || ''),
          user: {
            update: {
              name,
              email,
              phone: String(phone || ''),
              status
            }
          }
        },
        include: { user: true }
      });

      const mappedAgent = AdminController.mapAgentResponse(agent);
      sendResponse(res, 200, mappedAgent, "Agent updated successfully");
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

      const mappedAgent = AdminController.mapAgentResponse(agent);
      sendResponse(res, 200, mappedAgent, "Agent deactivated successfully");

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

      const mappedAgent = AdminController.mapAgentResponse(agent);
      sendResponse(res, 200, mappedAgent, "Agent activated successfully");

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

      const mappedAgent = AdminController.mapAgentResponse(agent);
      sendResponse(res, 200, mappedAgent, "Agent password reset successfully");

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
          prizeDistribution: true,
          _count: {
            select: { tickets: { where: { status: 'SOLD' } } }
          }
        }
      });

      const mappedLotteries = lotteries.map((l: any) => ({
        ...l,
        soldTickets: l._count.tickets,
        prizes: l.prizeDistribution
      }));

      sendResponse(res, 200, mappedLotteries);

    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }

  static async getLotteryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lottery = await prisma.lottery.findUnique({
        where: { id: String(id) },
        include: {
          agent: {
            include: {
              user: true
            }
          },
          prizeDistribution: true,
          _count: {
            select: { tickets: { where: { status: 'SOLD' } } }
          }
        }
      });

      if (!lottery) return sendError(res, 404, "Lottery not found");

      const mappedLottery = {
        ...(lottery as any),
        soldTickets: (lottery as any)._count.tickets,
        prizes: (lottery as any).prizeDistribution.map((p: any) => ({
          rank: p.position,
          amount: p.prizeAmount,
          description: p.description
        }))
      };

      sendResponse(res, 200, mappedLottery);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }

  static async getLotteryTickets(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tickets = await prisma.ticket.findMany({
        where: { lotteryId: String(id) },
        orderBy: { ticketNumber: 'asc' },
        include: {
          reservationTickets: {
            include: {
              reservation: true
            },
            where: {
              reservation: {
                status: { in: ['PENDING', 'APPROVED'] }
              }
            },
            take: 1
          }
        }
      });

      const mappedTickets = tickets.map((t: any) => ({
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
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }

  static async getLotteryWinners(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const winners = await prisma.winner.findMany({
        where: { lotteryId: String(id) },
        include: {
          ticket: true
        }
      });

      const mappedWinners = winners.map((w: any) => ({
        id: w.id,
        prizePosition: w.prizePosition,
        prizeAmount: w.prizeAmount,
        ticketNumber: w.ticket.ticketNumber,
        drawnAt: w.drawnAt,
        description: w.description
      }));

      sendResponse(res, 200, mappedWinners);
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
          lottery: {
            include: {
              agent: {
                include: {
                  user: true
                }
              }
            }
          },
          ticket: true
        }
      });

      const mappedWinners = winners.map((w: any) => ({
        id: w.id,
        lotteryId: w.lotteryId,
        lotteryTitle: w.lottery.title,
        winnerName: 'Winner', // Fallback
        ticketNumber: w.ticket.ticketNumber,
        prizeAmount: w.prizeAmount,
        prizeDescription: `Rank ${w.prizePosition}`,
        drawDate: w.drawnAt.toISOString(),
        agentName: w.lottery.agent?.user?.name || 'Unknown Agent'
      }));

      sendResponse(res, 200, mappedWinners);

    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }


  //////////////////////////////
  // SYSTEM MONITORING
  //////////////////////////////

  static async monitorSystem(req: Request, res: Response) {
    try {
      const summary = await AdminService.getSystemSummary();
      sendResponse(res, 200, summary);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }

  static async getDashboardActivity(req: Request, res: Response) {
    try {
      const activities = await AdminService.getRecentActivities();
      sendResponse(res, 200, activities);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  }

  static async updateNotificationSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { notifyInterval, notifyThreshold, notifyLanguage, customMessage } = req.body;

      const agent = await prisma.agent.update({
        where: { userId },
        data: {
          notifyInterval,
          notifyThreshold: Number(notifyThreshold),
          notifyLanguage,
          customMessage
        }
      });

      sendResponse(res, 200, agent, "Notification settings updated successfully");
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }

}