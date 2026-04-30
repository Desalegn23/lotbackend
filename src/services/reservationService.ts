import prisma from '../db/prisma.js';
import { ReservationStatus, TicketStatus } from '@prisma/client';

export class ReservationService {
  static async createPublicReservation(data: {
    lotteryId: string;
    name: string;
    email: string;
    phone: string;
    ticketIds: string[];
    userId?: string;
  }) {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Verify tickets are available
      const tickets = await tx.ticket.findMany({
        where: {
          id: { in: data.ticketIds },
          lotteryId: data.lotteryId,
          status: TicketStatus.AVAILABLE,
        },
      });

      if (tickets.length !== data.ticketIds.length) {
        throw new Error('Some tickets are no longer available or do not exist');
      }

      // 2. Create reservation
      const reservation = await tx.reservation.create({
        data: {
          lotteryId: data.lotteryId,
          userId: data.userId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: ReservationStatus.PENDING,
          tickets: {
            create: data.ticketIds.map((id) => ({
              ticketId: id,
            })),
          },
        },
      });

      // 3. Update tickets to RESERVED
      await tx.ticket.updateMany({
        where: {
          id: { in: data.ticketIds },
        },
        data: {
          status: TicketStatus.RESERVED,
          reservedBy: data.name,
        },
      });

      return reservation;
    });
  }

  static async createAgentReservation(data: {
    lotteryId: string;
    agentId: string;
    name: string;
    email: string;
    phone: string;
    ticketIds: string[];
  }) {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Verify tickets are available
      const tickets = await tx.ticket.findMany({
        where: {
          id: { in: data.ticketIds },
          lotteryId: data.lotteryId,
          status: TicketStatus.AVAILABLE,
        },
      });

      if (tickets.length !== data.ticketIds.length) {
        throw new Error('Some tickets are no longer available');
      }

      // 2. Create reservation (automatically APPROVED for agents)
      const reservation = await tx.reservation.create({
        data: {
          lotteryId: data.lotteryId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: ReservationStatus.APPROVED,
          reservedByAgent: true,
          paymentConfirmed: true,
          tickets: {
            create: data.ticketIds.map((id) => ({
              ticketId: id,
            })),
          },
        },
      });

      // 3. Update tickets to SOLD
      await tx.ticket.updateMany({
        where: {
          id: { in: data.ticketIds },
        },
        data: {
          status: TicketStatus.SOLD,
          reservedBy: data.name,
        },
      });

      return reservation;
    });
  }

  static async approveReservation(reservationId: string) {
    return await prisma.$transaction(async (tx: any) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { tickets: true },
      });

      if (!reservation || reservation.status !== ReservationStatus.PENDING) {
        throw new Error('Invalid reservation or status');
      }

      // Update reservation status
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.APPROVED,
          paymentConfirmed: true,
        },
      });

      // Update tickets to SOLD
      const ticketIds = reservation.tickets.map((rt: any) => rt.ticketId);
      await tx.ticket.updateMany({
        where: { id: { in: ticketIds } },
        data: { status: TicketStatus.SOLD },
      });

      return true;
    });
  }

  static async rejectReservation(reservationId: string) {
    return await prisma.$transaction(async (tx: any) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { tickets: true },
      });

      if (!reservation || reservation.status !== ReservationStatus.PENDING) {
        throw new Error('Invalid reservation or status');
      }

      // Update reservation status
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.REJECTED,
        },
      });

      // Update tickets to AVAILABLE
      const ticketIds = reservation.tickets.map((rt: any) => rt.ticketId);
      await tx.ticket.updateMany({
        where: { id: { in: ticketIds } },
        data: { 
          status: TicketStatus.AVAILABLE,
          reservedBy: null 
        },
      });

      return true;
    });
  }

  static async getAgentReservations(userId: string) {
    const agent = await prisma.agent.findUnique({
      where: { userId: userId },
    });

    if (!agent) throw new Error('Agent profile not found');

    return await prisma.reservation.findMany({
      where: {
        lottery: { agentId: agent.id },
      },
      include: {
        lottery: {
          select: { title: true }
        },
        tickets: {
          include: {
            ticket: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getUserReservations(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true }
    });

    if (!user) throw new Error('User not found');

    // 1. Find all reservations belonging to this user
    // Include those where userId matches OR (no userId but email/phone matches)
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { userId: userId },
          {
            userId: null,
            OR: [
              { email: user.email },
              user.phone ? { phone: user.phone } : {}
            ].filter(cond => Object.keys(cond).length > 0)
          }
        ]
      },
      include: {
        lottery: {
          select: { title: true }
        },
        tickets: {
          include: {
            ticket: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Auto-link unlinked reservations to this user for future efficiency
    const unlinkedIds = reservations
      .filter(r => !r.userId)
      .map(r => r.id);

    if (unlinkedIds.length > 0) {
      await prisma.reservation.updateMany({
        where: { id: { in: unlinkedIds } },
        data: { userId: userId }
      });
    }

    return reservations;
  }
}
