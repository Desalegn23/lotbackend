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
            const payload = (ctx as any).startPayload;
            let referrerAgentId = null;
            if (payload && payload.startsWith('agent_')) {
              referrerAgentId = payload.replace('agent_', '');
            }

            // Capture as a lead for marketing
            await prisma.telegramLead.upsert({
              where: { telegramId },
              update: { agentId: referrerAgentId },
              create: { 
                telegramId,
                agentId: referrerAgentId
              }
            });

            await ctx.reply(
              "👋 እንኳን ወደ ሎተሪ ቦት በደህና መጡ!\n\n" +
              "ለመጀመር እባክዎ አካውንቶን ለማገናኘት ሚኒ አፑን ይክፈቱ።",
              Markup.inlineKeyboard([
                [Markup.button.webApp("አፑን ክፈት", process.env.FRONTEND_URL || "")]
              ])
            );
            return;
          }

          let message = "";
          if (user.role === 'AGENT') {
            message = `👨‍💼 <b>እንኳን ደስ አለዎት ወኪል ${user.name}!</b>\n\nስለ አዲስ ቦታ ማስያዣዎች እና ስለተሸጡ ሎተሪዎች እዚህ መረጃ ይደርስዎታል።`;
          } else if (user.role === 'ADMIN') {
            message = `👑 <b>እንኳን ደህና መጡ አስተዳዳሪ ${user.name}!</b>\n\nየስርዓት ማንቂያዎች እና ማጠቃለያዎች እዚህ ይላካሉ።`;
          } else {
            message = `👋 <b>ሰላም ${user.name}!</b>\n\nወደ ሎተሪ እንኳን ደህና መጡ።`;
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
              await ctx.reply('ስህተት: ልክ ያልሆነ የወኪል መታወቂያ (Agent ID)።');
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

            await ctx.reply(`👋 ሰላም! ለሎተሪ መረጃዎች ከወኪል ${agent.user.name} ጋር በተሳካ ሁኔታ ተገናኝቻለሁ!`);
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
        `⏳ <b>አዲስ ቦታ ማስያዣ!</b>\n\n` +
        `ደንበኛ: <b>${reservation.name}</b>\n` +
        `ሎተሪ: <b>${reservation.lottery.title}</b>\n` +
        `ቲኬቶች: <b>${ticketNumbers}</b>\n` +
        `ጠቅላላ ዋጋ: <b>ETB ${reservation.tickets.length * reservation.lottery.ticketPrice}</b>\n\n` +
        `እባክዎን ክፍያውን ለማረጋገጥ ዳሽቦርዱን ይመልከቱ።`,
        Markup.inlineKeyboard([
          [Markup.button.webApp("ዳሽቦርዱን ክፈት", process.env.FRONTEND_URL || "")]
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
        `✅ <b>ክፍያ ተረጋግጧል!</b>\n\n` +
        `ለ <b>${reservation.lottery.title}</b> የያዙት ቦታ ተረጋግጧል።\n` +
        `የእርስዎ ቲኬቶች: <b>${ticketNumbers}</b>\n\n` +
        `መልካም እድል! 🍀`,
        Markup.inlineKeyboard([
          [Markup.button.url("ቲኬቶቼን እይ", this.getDeepLink(`lottery_${reservation.lotteryId}`))]
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
        await this.sendToGroup(group.chatId, message, markup);
      }
    } catch (e) {
      console.error(`Failed to send message to agent groups ${agentId}`, e);
    }
  }

  static async sendToGroup(chatId: string, message: string, markup?: any) {
    if (!this.bot) return;
    try {
      // If no markup provided, add a default "Join & Play" button
      const finalMarkup = markup || Markup.inlineKeyboard([
        [Markup.button.url("🍀 አሁኑኑ ይጫወቱ", this.getDeepLink("browse"))]
      ]);

      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...finalMarkup
      });
    } catch (e) {
      console.error(`Failed to send message to group ${chatId}`, e);
    }
  }

  static async notifyPublicSale(reservationId: string) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          lottery: {
            include: {
              _count: { select: { tickets: { where: { status: 'AVAILABLE' } } } },
              agent: true
            }
          },
          tickets: { include: { ticket: true } }
        }
      });

      if (!reservation) return;
      const { lottery } = reservation;
      
      const lang = lottery.notifyLanguage || lottery.agent.notifyLanguage || 'EN';
      const ticketNumbers = reservation.tickets.map(t => `#${t.ticket.ticketNumber}`).join(', ');
      // @ts-ignore
      const remainingCount = lottery._count?.tickets || 0;
      
      let message = "";
      if (lang === 'AM') {
        message = `🔥 <b>አዲስ ቲኬት ተሸጧል!</b> 🔥\n\n` +
          `👤 <b>${reservation.name}</b> ${ticketNumbers} ቁጥሮችን ለ <b>${lottery.title}</b> ወስደዋል!\n\n` +
          `አሁን የቀሩት <b>${remainingCount}</b> ቲኬቶች ብቻ ናቸው! 🍀`;
      } else {
        // Default to Amharic even if EN is requested, per user instruction
        message = `🔥 <b>አዲስ ቲኬት ተሸጧል!</b> 🔥\n\n` +
          `👤 <b>${reservation.name}</b> ${ticketNumbers} ቁጥሮችን ለ <b>${lottery.title}</b> ወስደዋል!\n\n` +
          `አሁን የቀሩት <b>${remainingCount}</b> ቲኬቶች ብቻ ናቸው! 🍀`;
      }

      const targetGroupIds = (lottery as any).telegramGroupIds;
      const btnText = "🍀 አሁኑኑ ይጫወቱ";
      const markup = Markup.inlineKeyboard([
        [Markup.button.url(btnText, NotificationService.getDeepLink(`lottery_${lottery.id}`))]
      ]);

      if (targetGroupIds && targetGroupIds.length > 0) {
        for (const gid of targetGroupIds) {
          await NotificationService.sendToGroup(gid, message, markup);
        }
      } else {
        await NotificationService.sendToAgentGroups(lottery.agentId, message, markup);
      }
    } catch (e) {
      console.error('Failed notifyPublicSale', e);
    }
  }
}
