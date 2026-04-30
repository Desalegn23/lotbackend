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

    // Handle bot being added to a group with payload
    this.bot.start(async (ctx) => {
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const payload = ctx.startPayload;
        if (payload && payload.startsWith('agent_')) {
          const agentId = payload.replace('agent_', '');
          
          try {
            // Verify agent exists
            const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { user: true } });
            if (!agent) {
              await ctx.reply('Error: Invalid Agent ID.');
              return;
            }

            // Save group
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

    // Enable graceful stop
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

  static async sendToAgentGroups(agentId: string, message: string, markup?: any) {
    if (!this.bot) return;
    try {
      const groups = await prisma.telegramGroup.findMany({
        where: { agentId }
      });

      for (const group of groups) {
        try {
          await this.bot.telegram.sendMessage(group.chatId, message, {
            parse_mode: 'HTML',
            ...markup
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
