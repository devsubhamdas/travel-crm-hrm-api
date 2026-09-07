import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetBookingsDto } from './dto/get-bookings.dto';
import { AddBookingTravellersDto } from './dto/add-booking-travellers.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureOpsAccess(user: any) {
    if (!user || !['admin', 'operator', 'manager'].includes(user.role)) {
      throw new ForbiddenException('Only admin/operator/manager can access bookings');
    }
  }

  async getBookings(currentUser: any, query: GetBookingsDto) {
    this.ensureOpsAccess(currentUser);

    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.max(Number(query.limit || 10), 1);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.payment_status) {
      where.payment_status = query.payment_status;
    }

    if (query.date_from || query.date_to) {
      where.travel_date = {};
      if (query.date_from) where.travel_date.gte = new Date(query.date_from);
      if (query.date_to) where.travel_date.lte = new Date(query.date_to);
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { customer_name: { contains: search } },
        { customer_email: { contains: search } },
        { customer_phone: { contains: search } },
      ];
    }

    const [bookings, total] = await Promise.all([
      this.prisma.bookings.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.bookings.count({ where }),
    ]);

    const tourIds = [...new Set(bookings.map((b) => b.tour_id).filter(Boolean))];

    const tours = tourIds.length
      ? await this.prisma.tours.findMany({
          where: { id: { in: tourIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            image_url: true,
          },
        })
      : [];

    const toursMap = new Map(tours.map((t) => [t.id, t]));

    return {
      items: bookings.map((b) => ({
        id: Number(b.id),
        customer_name: b.customer_name,
        customer_email: b.customer_email,
        customer_phone: b.customer_phone,
        tour_id: b.tour_id,
        tour_title: toursMap.get(b.tour_id)?.title || null,
        tour_slug: toursMap.get(b.tour_id)?.slug || null,
        tour_image_url: toursMap.get(b.tour_id)?.image_url || null,
        travel_date: b.travel_date,
        guests: b.guests,
        status: b.status,
        payment_status: b.payment_status,
        total_amount_paise: b.total_amount_paise,
        created_at: b.created_at,

        ops_notes: b.ops_notes,
        follow_up_status: b.follow_up_status,
        follow_up_date: b.follow_up_date,
        follow_up_note: b.follow_up_note,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingById(id: number, currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const booking = await this.prisma.bookings.findFirst({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const [tour, bookingDetails, travellers, payments] = await Promise.all([
      this.prisma.tours.findFirst({
        where: { id: booking.tour_id },
        select: {
          id: true,
          title: true,
          slug: true,
          image_url: true,
        },
      }),

      this.prisma.booking_details.findFirst({
        where: { booking_id: BigInt(id) },
      }),

      this.prisma.booking_travellers.findMany({
        where: { booking_id: BigInt(id) },
        orderBy: { id: 'asc' },
      }),

      this.prisma.payments.findMany({
        where: { booking_id: BigInt(id) },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const travellerIds = travellers.map((t) => t.id);

    const docs = travellerIds.length
      ? await this.prisma.traveller_documents.findMany({
          where: {
            booking_id: BigInt(id),
            traveller_id: { in: travellerIds },
          },
          orderBy: { uploaded_at: 'desc' },
        })
      : [];

    const docsByTraveller = new Map<number, any[]>();
    for (const doc of docs) {
      const travellerId = Number(doc.traveller_id);
      if (!docsByTraveller.has(travellerId)) docsByTraveller.set(travellerId, []);
      docsByTraveller.get(travellerId)!.push({
        ...doc,
        id: Number(doc.id),
        booking_id: Number(doc.booking_id),
        traveller_id: Number(doc.traveller_id),
      });
    }

    return {
      booking: {
        id: Number(booking.id),
        tour_id: booking.tour_id,
        user_id: booking.user_id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        guests: booking.guests,
        travel_date: booking.travel_date,
        departure_id: booking.departure_id,
        total_amount_paise: booking.total_amount_paise,
        payment_status: booking.payment_status,
        status: booking.status,
        created_at: booking.created_at,
        tour,

        ops_notes: booking.ops_notes,
        follow_up_status: booking.follow_up_status,
        follow_up_date: booking.follow_up_date,
        follow_up_note: booking.follow_up_note,
      },
      booking_details: bookingDetails,
      travellers: travellers.map((t) => ({
        ...t,
        id: Number(t.id),
        booking_id: Number(t.booking_id),
        documents: docsByTraveller.get(Number(t.id)) || [],
      })),
      payments: payments.map((p) => ({
        ...p,
        id: Number(p.id),
        booking_id: Number(p.booking_id),
        tour_id: Number(p.tour_id),
        user_id: p.user_id ? Number(p.user_id) : null,
      })),
    };
  }

  async updateBookingStatus(
    id: number,
    dto: {
      status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
      payment_status?: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
    },
    currentUser: any,
  ) {
    this.ensureOpsAccess(currentUser);

    if (!dto.status && !dto.payment_status) {
      throw new BadRequestException('At least one of status or payment_status is required');
    }

    const booking = await this.prisma.bookings.findFirst({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updated = await this.prisma.bookings.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.payment_status ? { payment_status: dto.payment_status } : {}),
      },
    });

    return {
      message: 'Booking status updated successfully',
      booking: {
        id: Number(updated.id),
        status: updated.status,
        payment_status: updated.payment_status,
        updated_fields: {
          status: dto.status ?? null,
          payment_status: dto.payment_status ?? null,
        },
      },
    };
  }

  async updateBookingNotes(id: number, dto: { ops_notes?: string }, currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const booking = await this.prisma.bookings.findFirst({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updated = await this.prisma.bookings.update({
      where: { id },
      data: {
        ops_notes: dto.ops_notes ?? null,
      },
    });

    return {
      message: 'Booking notes updated successfully',
      booking: {
        id: Number(updated.id),
        ops_notes: updated.ops_notes,
      },
    };
  }

  async updateBookingFollowUp(
    id: number,
    dto: {
      follow_up_status?:
        | 'pending'
        | 'follow_up_needed'
        | 'scheduled'
        | 'completed'
        | 'not_required';
      follow_up_date?: string;
      follow_up_note?: string;
    },
    currentUser: any,
  ) {
    this.ensureOpsAccess(currentUser);

    if (!dto.follow_up_status && !dto.follow_up_date && dto.follow_up_note === undefined) {
      throw new BadRequestException(
        'At least one of follow_up_status, follow_up_date, or follow_up_note is required',
      );
    }

    const booking = await this.prisma.bookings.findFirst({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const updated = await this.prisma.bookings.update({
      where: { id },
      data: {
        ...(dto.follow_up_status !== undefined ? { follow_up_status: dto.follow_up_status } : {}),
        ...(dto.follow_up_date !== undefined
          ? { follow_up_date: dto.follow_up_date ? new Date(dto.follow_up_date) : null }
          : {}),
        ...(dto.follow_up_note !== undefined ? { follow_up_note: dto.follow_up_note || null } : {}),
      },
    });

    return {
      message: 'Booking follow-up updated successfully',
      booking: {
        id: Number(updated.id),
        follow_up_status: updated.follow_up_status,
        follow_up_date: updated.follow_up_date,
        follow_up_note: updated.follow_up_note,
      },
    };
  }

  async getBookingFollowUps(currentUser: any, query: any) {
    this.ensureOpsAccess(currentUser);

    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.max(Number(query.limit || 10), 1);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.follow_up_status) {
      where.follow_up_status = query.follow_up_status;
    } else {
      where.follow_up_status = {
        in: ['pending', 'follow_up_needed', 'scheduled'],
      };
    }

    if (query.date_from || query.date_to) {
      where.follow_up_date = {};
      if (query.date_from) where.follow_up_date.gte = new Date(query.date_from);
      if (query.date_to) where.follow_up_date.lte = new Date(query.date_to);
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { customer_name: { contains: search } },
        { customer_email: { contains: search } },
        { customer_phone: { contains: search } },
      ];
    }

    const [bookings, total] = await Promise.all([
      this.prisma.bookings.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ follow_up_date: 'asc' }, { created_at: 'desc' }],
      }),
      this.prisma.bookings.count({ where }),
    ]);

    const tourIds = [...new Set(bookings.map((b) => b.tour_id).filter(Boolean))];

    const tours = tourIds.length
      ? await this.prisma.tours.findMany({
          where: { id: { in: tourIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            image_url: true,
          },
        })
      : [];

    const toursMap = new Map(tours.map((t) => [t.id, t]));

    return {
      items: bookings.map((b) => ({
        id: Number(b.id),
        customer_name: b.customer_name,
        customer_email: b.customer_email,
        customer_phone: b.customer_phone,
        tour_id: b.tour_id,
        tour_title: toursMap.get(b.tour_id)?.title || null,
        tour_slug: toursMap.get(b.tour_id)?.slug || null,
        tour_image_url: toursMap.get(b.tour_id)?.image_url || null,
        travel_date: b.travel_date,
        guests: b.guests,
        status: b.status,
        payment_status: b.payment_status,
        total_amount_paise: b.total_amount_paise,
        ops_notes: b.ops_notes,
        follow_up_status: b.follow_up_status,
        follow_up_date: b.follow_up_date,
        follow_up_note: b.follow_up_note,
        created_at: b.created_at,
        overdue:
          !!b.follow_up_date &&
          new Date(b.follow_up_date).getTime() < new Date(new Date().toDateString()).getTime() &&
          b.follow_up_status !== 'completed' &&
          b.follow_up_status !== 'not_required',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingTravellers(bookingId: number, currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const booking = await this.prisma.bookings.findFirst({
      where: { id: BigInt(bookingId) },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const travellers = await this.prisma.booking_travellers.findMany({
      where: {
        booking_id: BigInt(bookingId),
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    if (!travellers.length) {
      return { items: [] };
    }

    const travellerIds = travellers.map((t) => t.id);

    const documents = await this.prisma.traveller_documents.findMany({
      where: {
        booking_id: BigInt(bookingId),
        traveller_id: { in: travellerIds },
      },
      orderBy: [{ uploaded_at: 'desc' }, { id: 'desc' }],
    });

    const docsByTraveller = new Map<string, any[]>();

    for (const doc of documents) {
      const key = doc.traveller_id.toString();
      if (!docsByTraveller.has(key)) docsByTraveller.set(key, []);
      docsByTraveller.get(key)!.push(doc);
    }

    const items = travellers.map((traveller) => {
      const travellerDocs = docsByTraveller.get(traveller.id.toString()) || [];

      const summary = {
        passport: 'not_uploaded',
        visa: 'not_uploaded',
        id_proof: 'not_uploaded',
        supporting_count: 0,
      };

      for (const doc of travellerDocs) {
        if (doc.doc_type === 'passport') summary.passport = doc.status || 'not_uploaded';
        else if (doc.doc_type === 'visa') summary.visa = doc.status || 'not_uploaded';
        else if (doc.doc_type === 'id_proof') summary.id_proof = doc.status || 'not_uploaded';
        else if (doc.doc_type === 'supporting') summary.supporting_count += 1;
      }

      return {
        id: Number(traveller.id),
        booking_id: Number(traveller.booking_id),
        full_name: traveller.full_name,
        age: traveller.age,
        passport_number: traveller.passport_number,
        email: traveller.email,
        phone: traveller.phone,
        created_at: traveller.created_at,
        updated_at: traveller.updated_at,

        document_summary: summary,

        documents: travellerDocs.map((doc) => ({
          id: Number(doc.id),
          booking_id: Number(doc.booking_id),
          traveller_id: Number(doc.traveller_id),
          doc_type: doc.doc_type,
          doc_label: doc.doc_label,
          status: doc.status,
          file_url: doc.file_url,
          file_name: doc.file_name,
          rejection_reason: doc.rejection_reason,
          uploaded_at: doc.uploaded_at,
          updated_at: doc.updated_at,
        })),
      };
    });

    return { items };
  }

  async addBookingTravellers(bookingId: number, dto: AddBookingTravellersDto, currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const booking = await this.prisma.bookings.findFirst({
      where: { id: BigInt(bookingId) },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot add travellers to a cancelled booking');
    }

    const guestsAllowed = Number(booking.guests || 0);

    if (guestsAllowed <= 0) {
      throw new BadRequestException('This booking has invalid guests count');
    }

    const existingTravellersCount = await this.prisma.booking_travellers.count({
      where: {
        booking_id: BigInt(bookingId),
      },
    });

    const incomingCount = dto.travellers.length;
    const finalCount = existingTravellersCount + incomingCount;

    if (finalCount > guestsAllowed) {
      throw new BadRequestException(
        `Traveller limit exceeded. Booking allows ${guestsAllowed}, existing ${existingTravellersCount}, trying to add ${incomingCount}.`,
      );
    }

    const normalizedIncomingPassports = dto.travellers
      .map((t) => (t.passport_number || '').trim().toUpperCase())
      .filter(Boolean);

    const uniqueIncomingPassports = new Set(normalizedIncomingPassports);
    if (uniqueIncomingPassports.size !== normalizedIncomingPassports.length) {
      throw new BadRequestException('Duplicate passport numbers found in request');
    }

    if (normalizedIncomingPassports.length) {
      const existingPassportTravellers = await this.prisma.booking_travellers.findMany({
        where: {
          booking_id: BigInt(bookingId),
          passport_number: {
            in: normalizedIncomingPassports,
          },
        },
        select: {
          passport_number: true,
        },
      });

      if (existingPassportTravellers.length) {
        const duplicates = existingPassportTravellers
          .map((x) => x.passport_number)
          .filter(Boolean)
          .join(', ');

        throw new BadRequestException(
          `Passport number already exists in this booking: ${duplicates}`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const createdItems: Array<{
        id: number;
        booking_id: number;
        full_name: string;
      }> = [];

      for (const traveller of dto.travellers) {
        const createdTraveller = await tx.booking_travellers.create({
          data: {
            booking_id: BigInt(bookingId),
            full_name: traveller.full_name.trim(),
            age: traveller.age ?? null,
            passport_number: traveller.passport_number?.trim() || null,
            email: traveller.email?.trim().toLowerCase() || null,
            phone: traveller.phone?.trim() || null,
          },
        });

        const travellerId = createdTraveller.id;

        await tx.traveller_documents.createMany({
          data: [
            {
              booking_id: BigInt(bookingId),
              traveller_id: travellerId,
              doc_type: 'passport',
              doc_label: null,
              status: 'not_uploaded',
              required_doc_type: 'passport',
            },
            {
              booking_id: BigInt(bookingId),
              traveller_id: travellerId,
              doc_type: 'visa',
              doc_label: null,
              status: 'not_uploaded',
              required_doc_type: 'visa',
            },
            {
              booking_id: BigInt(bookingId),
              traveller_id: travellerId,
              doc_type: 'id_proof',
              doc_label: null,
              status: 'not_uploaded',
              required_doc_type: 'id_proof',
            },
          ],
        });

        createdItems.push({
          id: Number(createdTraveller.id),
          booking_id: Number(createdTraveller.booking_id),
          full_name: createdTraveller.full_name,
        });
      }

      return createdItems;
    });

    return {
      message: 'Travellers added successfully',
      count: result.length,
      items: result,
    };
  }

  async createBooking(payload: CreateBookingDto) {
    const result = await this.prisma.$transaction(async (tx) => {

      const hasTour = await tx.tours.findUnique({
        where: {id: payload.tour_id}
      });
      if(!hasTour) throw new NotFoundException('invalid tour id');

      const hasDeparture = await tx.tour_departures.findUnique({
        where: {id: payload.departure_id}
      })
      if(!hasDeparture) throw new NotFoundException('invalid departure id');
      
      if(hasDeparture.available_seats < payload.guests) {
        throw new BadRequestException('guest count cannot exceed available seats');
      }

      const user = await tx.user.findUnique({
        where: {
          email: payload.customer_email,
        },
      });

      await tx.tour_departures.update({
        where: {id: payload.departure_id},
        data: {
          available_seats: {
            decrement: payload.guests
          }
        }
      })

      return await tx.bookings.create({
        data: {
          ...payload,
          travel_date: payload.travel_date ? new Date(payload.travel_date) : null,
          user_id: user ? Number(user.id) : null,
          follow_up_date: payload.follow_up_date ? new Date(payload.follow_up_date) : null,
          total_amount_paise: payload.total_amount_paise * 100, // rupee to paisa convertion
        },
      });
    });

    return result;
  }
}
