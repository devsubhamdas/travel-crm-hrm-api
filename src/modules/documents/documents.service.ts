import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RejectDocumentDto } from './dto/reject-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureOpsAccess(user: any) {
    if (!user || !['admin', 'operator', 'manager'].includes(user.role)) {
      throw new ForbiddenException('Only admin/operator/manager can access documents');
    }
  }

  async getTravellerDocuments(travellerId: number, currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const traveller = await this.prisma.booking_travellers.findFirst({
      where: { id: BigInt(travellerId) },
      include: {
        bookings: true,
        traveller_documents: {
          orderBy: {
            uploaded_at: 'desc',
          },
        },
      },
    });

    if (!traveller) {
      throw new NotFoundException('Traveller not found');
    }

    const tour = traveller.bookings
      ? await this.prisma.tours.findFirst({
          where: { id: traveller.bookings.tour_id },
          select: {
            id: true,
            title: true,
            slug: true,
            image_url: true,
          },
        })
      : null;

    const required = {
      passport: null as any,
      visa: null as any,
      id_proof: null as any,
    };

    const supporting: any[] = [];

    for (const d of traveller.traveller_documents) {
      const mapped = {
        id: Number(d.id),
        booking_id: Number(d.booking_id),
        traveller_id: Number(d.traveller_id),
        doc_type: d.doc_type,
        doc_label: d.doc_label,
        status: d.status,
        file_url: d.file_url,
        file_name: d.file_name,
        rejection_reason: d.rejection_reason,
        uploaded_at: d.uploaded_at,
        updated_at: d.updated_at,
      };

      if (d.doc_type === 'supporting') supporting.push(mapped);
      else if (d.doc_type === 'passport') required.passport = mapped;
      else if (d.doc_type === 'visa') required.visa = mapped;
      else if (d.doc_type === 'id_proof') required.id_proof = mapped;
    }

    if (!required.passport) required.passport = { doc_type: 'passport', status: 'not_uploaded' };
    if (!required.visa) required.visa = { doc_type: 'visa', status: 'not_uploaded' };
    if (!required.id_proof) required.id_proof = { doc_type: 'id_proof', status: 'not_uploaded' };

    return {
      traveller: {
        id: Number(traveller.id),
        booking_id: Number(traveller.booking_id),
        full_name: traveller.full_name,
        age: traveller.age,
        email: traveller.email,
        phone: traveller.phone,
        passport_number: traveller.passport_number,
      },
      booking: traveller.bookings
        ? {
            id: Number(traveller.bookings.id),
            customer_name: traveller.bookings.customer_name,
            customer_email: traveller.bookings.customer_email,
            customer_phone: traveller.bookings.customer_phone,
            status: traveller.bookings.status,
            payment_status: traveller.bookings.payment_status,
            travel_date: traveller.bookings.travel_date,
            guests: traveller.bookings.guests,
            tour,
          }
        : null,
      documents: {
        required,
        supporting,
      },
    };
  }

  async verifyDocument(docId: number, currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const doc = await this.prisma.traveller_documents.findFirst({
      where: { id: BigInt(docId) },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const updated = await this.prisma.traveller_documents.update({
      where: { id: BigInt(docId) },
      data: {
        status: 'verified',
        rejection_reason: null,
        updated_at: new Date(),
      },
    });

    return {
      message: 'Document verified successfully',
      item: {
        id: Number(updated.id),
        status: updated.status,
        rejection_reason: updated.rejection_reason,
        updated_at: updated.updated_at,
      },
    };
  }

  async rejectDocument(docId: number, dto: RejectDocumentDto, currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const doc = await this.prisma.traveller_documents.findFirst({
      where: { id: BigInt(docId) },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const updated = await this.prisma.traveller_documents.update({
      where: { id: BigInt(docId) },
      data: {
        status: 'rejected',
        rejection_reason: dto.rejection_reason.trim(),
        updated_at: new Date(),
      },
    });

    return {
      message: 'Document rejected successfully',
      item: {
        id: Number(updated.id),
        status: updated.status,
        rejection_reason: updated.rejection_reason,
        updated_at: updated.updated_at,
      },
    };
  }
  async getPendingDocuments(currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const docs = await this.prisma.traveller_documents.findMany({
      where: {
        status: 'pending',
      },
      orderBy: {
        uploaded_at: 'desc',
      },
      include: {
        booking_travellers: true,
        bookings: true,
      },
    });

    const tourIds = [
      ...new Set(
        docs.map((d) => d.bookings?.tour_id).filter((id): id is number => typeof id === 'number'),
      ),
    ];

    const tours = tourIds.length
      ? await this.prisma.tours.findMany({
          where: {
            id: { in: tourIds },
          },
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
      items: docs.map((d) => ({
        id: Number(d.id),
        booking_id: Number(d.booking_id),
        traveller_id: Number(d.traveller_id),

        doc_type: d.doc_type,
        doc_label: d.doc_label,
        status: d.status,
        file_url: d.file_url,
        file_name: d.file_name,
        rejection_reason: d.rejection_reason,
        uploaded_at: d.uploaded_at,
        updated_at: d.updated_at,

        traveller_name: d.booking_travellers?.full_name || null,
        traveller_email: d.booking_travellers?.email || null,
        traveller_phone: d.booking_travellers?.phone || null,
        passport_number: d.booking_travellers?.passport_number || null,

        customer_name: d.bookings?.customer_name || null,
        customer_email: d.bookings?.customer_email || null,
        customer_phone: d.bookings?.customer_phone || null,
        travel_date: d.bookings?.travel_date || null,
        booking_status: d.bookings?.status || null,
        payment_status: d.bookings?.payment_status || null,

        tour_id: d.bookings?.tour_id || null,
        tour_title: d.bookings?.tour_id ? toursMap.get(d.bookings.tour_id)?.title || null : null,
        tour_slug: d.bookings?.tour_id ? toursMap.get(d.bookings.tour_id)?.slug || null : null,
        tour_image_url: d.bookings?.tour_id
          ? toursMap.get(d.bookings.tour_id)?.image_url || null
          : null,
      })),
    };
  }

  async getVerifiedDocuments(currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const docs = await this.prisma.traveller_documents.findMany({
      where: {
        status: 'verified',
      },
      orderBy: {
        uploaded_at: 'desc',
      },
      include: {
        booking_travellers: true,
        bookings: true,
      },
    });

    const tourIds = [
      ...new Set(
        docs.map((d) => d.bookings?.tour_id).filter((id): id is number => typeof id === 'number'),
      ),
    ];

    const tours = tourIds.length
      ? await this.prisma.tours.findMany({
          where: {
            id: { in: tourIds },
          },
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
      items: docs.map((d) => ({
        id: Number(d.id),
        booking_id: Number(d.booking_id),
        traveller_id: Number(d.traveller_id),

        doc_type: d.doc_type,
        doc_label: d.doc_label,
        status: d.status,
        file_url: d.file_url,
        file_name: d.file_name,
        rejection_reason: d.rejection_reason,
        uploaded_at: d.uploaded_at,
        updated_at: d.updated_at,

        traveller_name: d.booking_travellers?.full_name || null,
        traveller_email: d.booking_travellers?.email || null,
        traveller_phone: d.booking_travellers?.phone || null,
        passport_number: d.booking_travellers?.passport_number || null,

        customer_name: d.bookings?.customer_name || null,
        customer_email: d.bookings?.customer_email || null,
        customer_phone: d.bookings?.customer_phone || null,
        travel_date: d.bookings?.travel_date || null,
        booking_status: d.bookings?.status || null,
        payment_status: d.bookings?.payment_status || null,

        tour_id: d.bookings?.tour_id || null,
        tour_title: d.bookings?.tour_id ? toursMap.get(d.bookings.tour_id)?.title || null : null,
        tour_slug: d.bookings?.tour_id ? toursMap.get(d.bookings.tour_id)?.slug || null : null,
        tour_image_url: d.bookings?.tour_id
          ? toursMap.get(d.bookings.tour_id)?.image_url || null
          : null,
      })),
    };
  }

  async getRejectedDocuments(currentUser: any) {
    this.ensureOpsAccess(currentUser);

    const docs = await this.prisma.traveller_documents.findMany({
      where: {
        status: 'rejected',
      },
      orderBy: {
        uploaded_at: 'desc',
      },
      include: {
        booking_travellers: true,
        bookings: true,
      },
    });

    const tourIds = [
      ...new Set(
        docs.map((d) => d.bookings?.tour_id).filter((id): id is number => typeof id === 'number'),
      ),
    ];

    const tours = tourIds.length
      ? await this.prisma.tours.findMany({
          where: {
            id: { in: tourIds },
          },
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
      items: docs.map((d) => ({
        id: Number(d.id),
        booking_id: Number(d.booking_id),
        traveller_id: Number(d.traveller_id),

        doc_type: d.doc_type,
        doc_label: d.doc_label,
        status: d.status,
        file_url: d.file_url,
        file_name: d.file_name,
        rejection_reason: d.rejection_reason,
        uploaded_at: d.uploaded_at,
        updated_at: d.updated_at,

        traveller_name: d.booking_travellers?.full_name || null,
        traveller_email: d.booking_travellers?.email || null,
        traveller_phone: d.booking_travellers?.phone || null,
        passport_number: d.booking_travellers?.passport_number || null,

        customer_name: d.bookings?.customer_name || null,
        customer_email: d.bookings?.customer_email || null,
        customer_phone: d.bookings?.customer_phone || null,
        travel_date: d.bookings?.travel_date || null,
        booking_status: d.bookings?.status || null,
        payment_status: d.bookings?.payment_status || null,

        tour_id: d.bookings?.tour_id || null,
        tour_title: d.bookings?.tour_id ? toursMap.get(d.bookings.tour_id)?.title || null : null,
        tour_slug: d.bookings?.tour_id ? toursMap.get(d.bookings.tour_id)?.slug || null : null,
        tour_image_url: d.bookings?.tour_id
          ? toursMap.get(d.bookings.tour_id)?.image_url || null
          : null,
      })),
    };
  }
}
