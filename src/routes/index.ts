import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { LotteryController } from '../controllers/lotteryController.js';
import { ReservationController } from '../controllers/reservationController.js';
import { AdminController } from '../controllers/adminController.js';
import { authenticate, authenticateOptional, agentOnly, adminOnly } from '../middleware/auth.js';

const router = Router();

// ─────────────────────────────────────────────
// AUTH ROUTES (public)
// ─────────────────────────────────────────────
router.post('/auth/signup', AuthController.signup);
router.post('/auth/login', AuthController.login);
router.post('/auth/telegram', AuthController.loginWithTelegram);
router.post('/auth/telegram/link', authenticate, AuthController.linkTelegram);
router.get('/auth/me', authenticate, AuthController.me);
router.post('/auth/change-password', authenticate, AuthController.changePassword);
router.post('/auth/bootstrap-admin', AuthController.bootstrapAdmin); // one-time setup, remove in prod


// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────
router.get('/lotteries', LotteryController.list);
router.get('/lotteries/:id', LotteryController.getById);
router.get('/lotteries/:id/tickets', LotteryController.getTickets);
router.get('/lotteries/:id/winners', LotteryController.listLotteryWinners);
router.get('/winners', LotteryController.listWinners);
router.post('/reservations', authenticateOptional, ReservationController.reserve);
router.get('/user/reservations', authenticate, ReservationController.listUserTickets);

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
router.get('/agent/profile', authenticate, agentOnly, AuthController.getAgentProfile);
router.put('/agent/profile', authenticate, agentOnly, AuthController.updateAgentProfile);
router.get('/agent/summary', authenticate, agentOnly, LotteryController.getMyStats);
router.get('/agent/winners', authenticate, agentOnly, LotteryController.listMyWinners);
router.get('/agent/lotteries/:id/tickets', authenticate, agentOnly, LotteryController.getMyLotteryTickets);
router.get('/agent/lotteries/:id/winners', authenticate, agentOnly, LotteryController.getMyLotteryWinners);
router.put('/agent/notification-settings', authenticate, agentOnly, AdminController.updateNotificationSettings);
router.put('/agent/lotteries/:id/notification-settings', authenticate, agentOnly, AdminController.updateLotteryNotificationSettings);


// ─────────────────────────────────────────────
// ADMIN ROUTES (JWT required, role: ADMIN only)
// ─────────────────────────────────────────────
router.get('/admin/agents', authenticate, adminOnly, AdminController.listAgents);
router.get('/admin/agents/:id', authenticate, adminOnly, AdminController.getAgentById);
router.post('/admin/agents', authenticate, adminOnly, AdminController.createAgent);
router.put('/admin/agents/:id', authenticate, adminOnly, AdminController.updateAgent);
router.patch('/admin/agents/:id/deactivate', authenticate, adminOnly, AdminController.deactivateAgent);
router.patch('/admin/agents/:id/activate', authenticate, adminOnly, AdminController.activateAgent);
router.post('/admin/agents/:id/reset-password', authenticate, adminOnly, AdminController.resetAgentPassword);
router.delete('/admin/agents/:id', authenticate, adminOnly, AdminController.deleteAgent);

router.get('/admin/lotteries', authenticate, adminOnly, AdminController.listLotteries);
router.get('/admin/lotteries/:id', authenticate, adminOnly, AdminController.getLotteryById);
router.get('/admin/lotteries/:id/tickets', authenticate, adminOnly, AdminController.getLotteryTickets);
router.get('/admin/lotteries/:id/winners', authenticate, adminOnly, AdminController.getLotteryWinners);
router.get('/admin/tickets', authenticate, adminOnly, AdminController.listTickets);
router.get('/admin/winners', authenticate, adminOnly, AdminController.listWinners);
router.get('/admin/summary', authenticate, adminOnly, AdminController.monitorSystem);
router.get('/admin/activities', authenticate, adminOnly, AdminController.getDashboardActivity);

export default router;
