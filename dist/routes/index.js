import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { LotteryController } from '../controllers/lotteryController.js';
import { ReservationController } from '../controllers/reservationController.js';
import { AdminController } from '../controllers/adminController.js';
import { authenticate, agentOnly, adminOnly } from '../middleware/auth.js';
const router = Router();
// ─────────────────────────────────────────────
// AUTH ROUTES (public)
// ─────────────────────────────────────────────
router.post('/auth/signup', AuthController.signup);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticate, AuthController.me);
router.post('/auth/bootstrap-admin', AuthController.bootstrapAdmin); // one-time setup, remove in prod
// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────
router.get('/lotteries', LotteryController.list);
router.get('/lotteries/:id', LotteryController.getById);
router.get('/lotteries/:id/tickets', LotteryController.getTickets);
router.post('/reservations', ReservationController.reserve);
// ─────────────────────────────────────────────
// AGENT ROUTES (JWT required, role: AGENT or ADMIN)
// ─────────────────────────────────────────────
router.post('/agent/lotteries', authenticate, agentOnly, LotteryController.create);
router.post('/agent/reserve', authenticate, agentOnly, ReservationController.agentReserve);
router.post('/agent/reservations/:id/approve', authenticate, agentOnly, ReservationController.approve);
router.post('/agent/reservations/:id/reject', authenticate, agentOnly, ReservationController.reject);
router.post('/agent/lotteries/:id/draw', authenticate, agentOnly, LotteryController.draw);
router.get('/agent/lotteries', authenticate, agentOnly, LotteryController.listMyLotteries);
router.get('/agent/reservations', authenticate, agentOnly, ReservationController.listMyReservations);
router.get('/agent/summary', authenticate, agentOnly, LotteryController.getMyStats);
router.get('/agent/winners', authenticate, agentOnly, LotteryController.listMyWinners);
// ─────────────────────────────────────────────
// ADMIN ROUTES (JWT required, role: ADMIN only)
// ─────────────────────────────────────────────
router.get('/admin/agents', authenticate, adminOnly, AdminController.listAgents);
router.post('/admin/agents', authenticate, adminOnly, AdminController.createAgent);
router.put('/admin/agents/:id', authenticate, adminOnly, AdminController.updateAgent);
router.patch('/admin/agents/:id/deactivate', authenticate, adminOnly, AdminController.deactivateAgent);
router.patch('/admin/agents/:id/activate', authenticate, adminOnly, AdminController.activateAgent);
router.post('/admin/agents/:id/reset-password', authenticate, adminOnly, AdminController.resetAgentPassword);
router.delete('/admin/agents/:id', authenticate, adminOnly, AdminController.deleteAgent);
router.get('/admin/lotteries', authenticate, adminOnly, AdminController.listLotteries);
router.get('/admin/tickets', authenticate, adminOnly, AdminController.listTickets);
router.get('/admin/winners', authenticate, adminOnly, AdminController.listWinners);
router.get('/admin/summary', authenticate, adminOnly, AdminController.monitorSystem);
export default router;
//# sourceMappingURL=index.js.map