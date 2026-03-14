"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const lotteryController_js_1 = require("../controllers/lotteryController.js");
const reservationController_js_1 = require("../controllers/reservationController.js");
const adminController_js_1 = require("../controllers/adminController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────
// AUTH ROUTES (public)
// ─────────────────────────────────────────────
router.post('/auth/signup', authController_js_1.AuthController.signup);
router.post('/auth/login', authController_js_1.AuthController.login);
router.get('/auth/me', auth_js_1.authenticate, authController_js_1.AuthController.me);
router.post('/auth/bootstrap-admin', authController_js_1.AuthController.bootstrapAdmin); // one-time setup, remove in prod
// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────
router.get('/lotteries', lotteryController_js_1.LotteryController.list);
router.get('/lotteries/:id', lotteryController_js_1.LotteryController.getById);
router.get('/lotteries/:id/tickets', lotteryController_js_1.LotteryController.getTickets);
router.post('/reservations', reservationController_js_1.ReservationController.reserve);
// ─────────────────────────────────────────────
// AGENT ROUTES (JWT required, role: AGENT or ADMIN)
// ─────────────────────────────────────────────
router.post('/agent/lotteries', auth_js_1.authenticate, auth_js_1.agentOnly, lotteryController_js_1.LotteryController.create);
router.post('/agent/reserve', auth_js_1.authenticate, auth_js_1.agentOnly, reservationController_js_1.ReservationController.agentReserve);
router.post('/agent/reservations/:id/approve', auth_js_1.authenticate, auth_js_1.agentOnly, reservationController_js_1.ReservationController.approve);
router.post('/agent/reservations/:id/reject', auth_js_1.authenticate, auth_js_1.agentOnly, reservationController_js_1.ReservationController.reject);
router.post('/agent/lotteries/:id/draw', auth_js_1.authenticate, auth_js_1.agentOnly, lotteryController_js_1.LotteryController.draw);
// ─────────────────────────────────────────────
// ADMIN ROUTES (JWT required, role: ADMIN only)
// ─────────────────────────────────────────────
router.get('/admin/agents', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.listAgents);
router.post('/admin/agents', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.createAgent);
router.put('/admin/agents/:id', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.updateAgent);
router.patch('/admin/agents/:id/deactivate', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.deactivateAgent);
router.patch('/admin/agents/:id/activate', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.activateAgent);
router.post('/admin/agents/:id/reset-password', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.resetAgentPassword);
router.delete('/admin/agents/:id', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.deleteAgent);
router.get('/admin/lotteries', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.listLotteries);
router.get('/admin/tickets', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.listTickets);
router.get('/admin/winners', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.listWinners);
router.get('/admin/summary', auth_js_1.authenticate, auth_js_1.adminOnly, adminController_js_1.AdminController.monitorSystem);
exports.default = router;
//# sourceMappingURL=index.js.map