import { Telegraf, Markup } from 'telegraf';
import prisma from '../db/prisma.js';

export class NotificationService {
  private static bot: Telegraf | null = null;
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) return;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('TELEGRAM_BOT_TOKEN is not set. Notifications disabled.');
      return;
    }

    this.bot = new Telegraf(token);

    // Handle start
    this.bot.start(async (ctx) => {
      // Private chat handler
      if (ctx.chat.type === 'private') {
        const telegramId = ctx.from.id.toString();
        try {
          const user = await prisma.user.findUnique({ where: { telegramId } });
          
          if (!user) {
            // Capture as a lead for marketing
            await prisma.telegramLead.upsert({
              where: { telegramId },
              update: {},
              create: { telegramId }
            });

            await ctx.reply(
              "👋 Welcome to the Lottery Bot!\n\n" +
              "To get started, please open our Mini App to link your account.",
              Markup.inlineKeyboard([
                [Markup.button.webApp("Open Mini App", process.env.FRONTEND_URL || "")]
              ])
            );
            return;
          }

          let message = "";
          if (user.role === 'AGENT') {
            message = `👨‍💼 <b>Welcome Agent ${user.name}!</b>\n\nYou will receive updates here about new reservations and sold-out lotteries.`;
          } else if (user.role === 'ADMIN') {
            message = `👑 <b>Welcome Admin ${user.name}!</b>\n\nSystem alerts and summaries will be sent here.`;
          } else {
            message = `👋 <b>Hello ${user.name}!</b>\n\nWelcome to your lottery dashboard. You will receive winner alerts and reservation updates here.`;
          }

          await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (e) {
          console.error('Failed to handle bot start', e);
        }
        return;
      }

      // Group/Supergroup logic with payload
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const payload = ctx.startPayload;
        if (payload && payload.startsWith('agent_')) {
          const agentId = payload.replace('agent_', '');
          
          try {
            const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { user: true } });
            if (!agent) {
              await ctx.reply('Error: Invalid Agent ID.');
              return;
            }

            await prisma.telegramGroup.upsert({
              where: { chatId: ctx.chat.id.toString() },
              update: { agentId, groupName: ctx.chat.title },
              create: {
                chatId: ctx.chat.id.toString(),
                agentId,
                groupName: ctx.chat.title,
              }
            });

            await ctx.reply(`👋 Hello! I have been successfully linked to agent ${agent.user.name} for lottery updates!`);
          } catch (e) {
            console.error('Failed to link telegram group', e);
          }
        }
      }
    });

    // Launch bot
    this.bot.launch().catch(e => console.error('Failed to launch telegraf', e));
    this.isInitialized = true;

    process.once('SIGINT', () => this.bot?.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    
    console.log('Telegram Bot initialized for Notifications.');
  }

  static async sendToUser(telegramId: string, message: string, markup?: any) {
    if (!this.bot) return;
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        ...markup
      });
    } catch (e) {
      console.error(`Failed to send message to user ${telegramId}`, e);
    }
  }

  static async sendToUserById(userId: string, message: string, markup?: any) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
      if (user?.telegramId) {
        await this.sendToUser(user.telegramId, message, markup);
      }
    } catch (e) {
      console.error(`Failed to send message to userId ${userId}`, e);
    }
  }

  static async broadcastToRole(role: 'USER' | 'AGENT' | 'ADMIN', message: string) {
    try {
      const users = await prisma.user.findMany({
        where: { role, telegramId: { not: null } },
        select: { telegramId: true }
      });

      const telegramIds = new Set(users.map(u => u.telegramId).filter(Boolean) as string[]);

      // If broadcasting to USERS, also include TelegramLeads
      if (role === 'USER') {
        const leads = await prisma.telegramLead.findMany({ select: { telegramId: true } });
        leads.forEach(l => telegramIds.add(l.telegramId));
      }

      for (const tid of telegramIds) {
        await this.sendToUser(tid, message);
      }
    } catch (e) {
      console.error(`Failed to broadcast to role ${role}`, e);
    }
  }

  static getDeepLink(param: string) {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'daily_meznagna_bot';
    const appName = process.env.TELEGRAM_APP_NAME || 'play';
    // Format: https://t.me/botusername/appname?startapp=parameter
    return `https://t.me/${botUsername}/${appName}?startapp=${param}`;
  }

  /**
   * Event: New Reservation Created
   * Notifies the agent about a pending payment.
   */
  static async notifyReservationCreated(reservationId: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          lottery: { include: { agent: { include: { user: true } } } },
          tickets: { include: { ticket: true } }
        }
      });

      if (!reservation || !reservation.lottery.agent.user.telegramId) return;

      const ticketNumbers = reservation.tickets.map(t => t.ticket.ticketNumber).join(', ');
      
      await this.sendToUser(
        reservation.lottery.agent.user.telegramId,
        `⏳ <b>New Reservation!</b>\n\n` +
        `Customer: <b>${reservation.name}</b>\n` +
        `Lottery: <b>${reservation.lottery.title}</b>\n` +
        `Tickets: <b>${ticketNumbers}</b>\n` +
        `Amount: <b>ETB ${reservation.tickets.length * reservation.lottery.ticketPrice}</b>\n\n` +
        `Please check the dashboard to confirm payment.`,
        Markup.inlineKeyboard([
          [Markup.button.webApp("Open Dashboard", process.env.FRONTEND_URL || "")]
        ])
      );
    } catch (e) {
      console.error('Failed notifyReservationCreated', e);
    }
  }

  /**
   * Event: Reservation Approved
   * Notifies the customer that their tickets are secured.
   */
  static async notifyReservationApproved(reservationId: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          user: true,
          lottery: true,
          tickets: { include: { ticket: true } }
        }
      });

      if (!reservation || !reservation.user?.telegramId) return;

      const ticketNumbers = reservation.tickets.map(t => t.ticket.ticketNumber).join(', ');

      await this.sendToUser(
        reservation.user.telegramId,
        `✅ <b>Payment Confirmed!</b>\n\n` +
        `Your reservation for <b>${reservation.lottery.title}</b> has been approved.\n` +
        `Your tickets: <b>${ticketNumbers}</b>\n\n` +
        `Good luck! 🍀`,
        Markup.inlineKeyboard([
          [Markup.button.url("View My Tickets", this.getDeepLink(`lottery_${reservation.lotteryId}`))]
        ])
      );
    } catch (e) {
      console.error('Failed notifyReservationApproved', e);
    }
  }

  static async sendToAgentGroups(agentId: string, message: string, markup?: any) {
    if (!this.bot) return;
    try {
      const groups = await prisma.telegramGroup.findMany({
        where: { agentId }
      });

      for (const group of groups) {
        try {
          // If no markup provided, add a default "Join & Play" button
          const finalMarkup = markup || Markup.inlineKeyboard([
            [Markup.button.url("🍀 Play Now", this.getDeepLink("browse"))]
          ]);

          await this.bot.telegram.sendMessage(group.chatId, message, {
            parse_mode: 'HTML',
            ...finalMarkup
          });
        } catch (e) {
          console.error(`Failed to send message to group ${group.chatId}`, e);
        }
      }
    } catch (e) {
      console.error(`Failed to send message to agent groups ${agentId}`, e);
    }
  }
}
