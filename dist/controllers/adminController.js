"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const response_js_1 = require("../utils/response.js");
const bcrypt_1 = __importDefault(require("bcrypt"));
class AdminController {
    //////////////////////////////
    // AGENTS
    //////////////////////////////
    static async listAgents(req, res) {
        try {
            const agents = await prisma_js_1.default.agent.findMany({
                include: {
                    user: true,
                    lotteries: true
                }
            });
            (0, response_js_1.sendResponse)(res, 200, agents);
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
    static async createAgent(req, res) {
        try {
            const { name, email, phone } = req.body;
            const existingUser = await prisma_js_1.default.user.findUnique({
                where: { email }
            });
            if (existingUser) {
                return (0, response_js_1.sendError)(res, 400, "Email already exists");
            }
            const hashedPassword = await bcrypt_1.default.hash("password", 10);
            const agent = await prisma_js_1.default.$transaction(async (tx) => {
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
                        userId: user.id
                    },
                    include: {
                        user: true
                    }
                });
            });
            (0, response_js_1.sendResponse)(res, 201, agent, "Agent created successfully");
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async updateAgent(req, res) {
        try {
            const { name, email, phone } = req.body;
            const agent = await prisma_js_1.default.agent.update({
                where: { id: String(req.params.id) },
                data: {
                    user: {
                        update: {
                            name,
                            email,
                            phone
                        }
                    }
                },
                include: { user: true }
            });
            (0, response_js_1.sendResponse)(res, 200, agent, "Agent updated successfully");
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async deactivateAgent(req, res) {
        try {
            const agent = await prisma_js_1.default.agent.update({
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
            (0, response_js_1.sendResponse)(res, 200, agent, "Agent deactivated successfully");
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async activateAgent(req, res) {
        try {
            const agent = await prisma_js_1.default.agent.update({
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
            (0, response_js_1.sendResponse)(res, 200, agent, "Agent activated successfully");
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async resetAgentPassword(req, res) {
        try {
            const hashedPassword = await bcrypt_1.default.hash("password", 10);
            const agent = await prisma_js_1.default.agent.update({
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
            (0, response_js_1.sendResponse)(res, 200, agent, "Agent password reset successfully");
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    static async deleteAgent(req, res) {
        try {
            await prisma_js_1.default.$transaction(async (tx) => {
                const agent = await tx.agent.findUnique({
                    where: { id: String(req.params.id) }
                });
                if (!agent)
                    throw new Error("Agent not found");
                await tx.agent.delete({
                    where: { id: agent.id }
                });
                await tx.user.delete({
                    where: { id: agent.userId }
                });
            });
            (0, response_js_1.sendResponse)(res, 200, null, "Agent deleted successfully");
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 400, error.message);
        }
    }
    //////////////////////////////
    // LOTTERIES
    //////////////////////////////
    static async listLotteries(req, res) {
        try {
            const lotteries = await prisma_js_1.default.lottery.findMany({
                include: {
                    agent: {
                        include: {
                            user: true
                        }
                    },
                    prizeDistribution: true
                }
            });
            (0, response_js_1.sendResponse)(res, 200, lotteries);
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
    //////////////////////////////
    // TICKETS
    //////////////////////////////
    static async listTickets(req, res) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;
            const tickets = await prisma_js_1.default.ticket.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    lottery: true
                }
            });
            (0, response_js_1.sendResponse)(res, 200, tickets);
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
    //////////////////////////////
    // WINNERS
    //////////////////////////////
    static async listWinners(req, res) {
        try {
            const winners = await prisma_js_1.default.winner.findMany({
                include: {
                    lottery: true,
                    ticket: true
                }
            });
            (0, response_js_1.sendResponse)(res, 200, winners);
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
    //////////////////////////////
    // SYSTEM MONITORING
    //////////////////////////////
    static async monitorSystem(req, res) {
        try {
            const [lotteryCount, ticketCount, winnerCount, activeReservations] = await Promise.all([
                prisma_js_1.default.lottery.count(),
                prisma_js_1.default.ticket.count(),
                prisma_js_1.default.winner.count(),
                prisma_js_1.default.reservation.count({
                    where: { status: "PENDING" }
                })
            ]);
            (0, response_js_1.sendResponse)(res, 200, {
                lotteries: lotteryCount,
                tickets: ticketCount,
                winners: winnerCount,
                pendingReservations: activeReservations
            });
        }
        catch (error) {
            (0, response_js_1.sendError)(res, 500, error.message);
        }
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=adminController.js.map