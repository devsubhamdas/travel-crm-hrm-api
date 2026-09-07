// src/modules/leads/leads-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetLeadsDto } from './dto/get-leads.dto';

type SyncResult = {
  source: string;
  scanned: number;
  inserted: number;
  skipped: number;
};

@Injectable()
export class LeadsSyncService {
  private readonly logger = new Logger(LeadsSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncAllSources() {
    const results: SyncResult[] = [];

    results.push(await this.syncTripLeads());
    results.push(await this.syncEnquiries());
    results.push(await this.syncItineraries());
    results.push(await this.syncContacts());

    return {
      success: true,
      results,
      totalInserted: results.reduce((sum, r) => sum + r.inserted, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    };
  }

  async syncTripLeads(): Promise<SyncResult> {
    const sourceTable = 'trip_leads';
    const sourceType = 'trip_lead';

    const rows = await this.prisma.trip_leads.findMany({
      orderBy: { created_at: 'asc' },
    });

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const alreadySynced = await this.prisma.lead_sync_logs.findUnique({
        where: {
          source_table_source_row_id: {
            source_table: sourceTable,
            source_row_id: BigInt(row.id),
          },
        },
      });

      if (alreadySynced) {
        skipped++;
        continue;
      }

      const destination =
        [row.preferred_country, row.preferred_city].filter(Boolean).join(', ') || null;

      const travellersCount =
        Number(row.number_of_adults || 0) + Number(row.number_of_children || 0);

      const remarkParts = [
        row.trip_type ? `Trip Type: ${row.trip_type}` : null,
        row.hotel_rating ? `Hotel: ${row.hotel_rating}` : null,
        row.meal_plan ? `Meal: ${row.meal_plan}` : null,
        row.room_type ? `Room: ${row.room_type}` : null,
        row.need_flight !== null && row.need_flight !== undefined
          ? `Flight: ${row.need_flight ? 'Yes' : 'No'}`
          : null,
        row.departure_airport ? `Departure Airport: ${row.departure_airport}` : null,
        row.number_of_days ? `Days: ${row.number_of_days}` : null,
      ].filter(Boolean);

      const lead = await this.prisma.leads.create({
        data: {
          lead_code: 'TEMP',
          source_type: sourceType as any,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),

          name: row.full_name || 'Unknown',
          email: row.email || null,
          contact_no: row.phone_number || null,

          destination,
          travel_date: row.departure_date ?? null,
          travellers_count: travellersCount || null,
          budget: row.estimate_range || null,
          source: 'Trip Planner',
          remark: remarkParts.length ? remarkParts.join(' | ') : null,

          status: 'new' as any,
          follow_up_status: 'pending' as any,

          raw_payload: this.toJsonString(row),
        },
      });

      const leadCode = this.generateLeadCode(lead.id);
      await this.prisma.leads.update({
        where: { id: lead.id },
        data: { lead_code: leadCode },
      });

      await this.prisma.lead_sync_logs.create({
        data: {
          source_type: sourceType,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),
          lead_id: lead.id,
        },
      });

      await this.prisma.lead_activities.create({
        data: {
          lead_id: lead.id,
          activity_type: 'created' as any,
          note: `Lead synced from ${sourceTable}`,
        },
      });

      inserted++;
    }

    return {
      source: sourceTable,
      scanned: rows.length,
      inserted,
      skipped,
    };
  }

  async syncEnquiries(): Promise<SyncResult> {
    const sourceTable = 'enquiries';
    const sourceType = 'enquiry';

    const rows = await this.prisma.enquiries.findMany({
      orderBy: { created_at: 'asc' },
      include: {
        tours: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const alreadySynced = await this.prisma.lead_sync_logs.findUnique({
        where: {
          source_table_source_row_id: {
            source_table: sourceTable,
            source_row_id: BigInt(row.id),
          },
        },
      });

      if (alreadySynced) {
        skipped++;
        continue;
      }

      const lead = await this.prisma.leads.create({
        data: {
          lead_code: 'TEMP',
          source_type: sourceType as any,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),

          name: row.name || 'Unknown',
          email: row.email || null,
          contact_no: row.phone || null,

          destination: row.tours?.title || null,
          travel_date: null,
          travellers_count: null,
          budget: null,
          source: 'Website',
          remark: row.description || null,

          status: 'new' as any,
          follow_up_status: 'pending' as any,

          tour_id: row.tour_id ? BigInt(row.tour_id) : null,
          raw_payload: this.toJsonString(row),
        },
      });

      const leadCode = this.generateLeadCode(lead.id);
      await this.prisma.leads.update({
        where: { id: lead.id },
        data: { lead_code: leadCode },
      });

      await this.prisma.lead_sync_logs.create({
        data: {
          source_type: sourceType,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),
          lead_id: lead.id,
        },
      });

      await this.prisma.lead_activities.create({
        data: {
          lead_id: lead.id,
          activity_type: 'created' as any,
          note: `Lead synced from ${sourceTable}`,
        },
      });

      inserted++;
    }

    return {
      source: sourceTable,
      scanned: rows.length,
      inserted,
      skipped,
    };
  }

  async syncItineraries(): Promise<SyncResult> {
    const sourceTable = 'itineraries';
    const sourceType = 'itinerary';

    const rows = await this.prisma.itineraries.findMany({
      orderBy: { created_at: 'asc' },
    });

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const alreadySynced = await this.prisma.lead_sync_logs.findUnique({
        where: {
          source_table_source_row_id: {
            source_table: sourceTable,
            source_row_id: BigInt(row.id),
          },
        },
      });

      if (alreadySynced) {
        skipped++;
        continue;
      }

      const travellersCount = Number(row.travelers || 0) + Number(row.children || 0);

      const remarkParts = [
        row.preferences ? `Preferences: ${row.preferences}` : null,
        row.travel_type ? `Travel Type: ${row.travel_type}` : null,
        row.occupation ? `Occupation: ${row.occupation}` : null,
        row.hotel_category ? `Hotel Category: ${row.hotel_category}` : null,
        row.duration ? `Duration: ${row.duration} days` : null,
      ].filter(Boolean);

      const lead = await this.prisma.leads.create({
        data: {
          lead_code: 'TEMP',
          source_type: sourceType as any,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),

          name: row.name || 'Unknown',
          email: row.email || null,
          contact_no: row.phone || null,

          destination: row.destination || null,
          travel_date: row.date ?? null,
          travellers_count: travellersCount || null,
          budget: row.budget || null,
          source: 'Itinerary Planner',
          remark: remarkParts.length ? remarkParts.join(' | ') : null,

          status: 'new' as any,
          follow_up_status: 'pending' as any,

          raw_payload: this.toJsonString(row),
        },
      });

      const leadCode = this.generateLeadCode(lead.id);
      await this.prisma.leads.update({
        where: { id: lead.id },
        data: { lead_code: leadCode },
      });

      await this.prisma.lead_sync_logs.create({
        data: {
          source_type: sourceType,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),
          lead_id: lead.id,
        },
      });

      await this.prisma.lead_activities.create({
        data: {
          lead_id: lead.id,
          activity_type: 'created' as any,
          note: `Lead synced from ${sourceTable}`,
        },
      });

      inserted++;
    }

    return {
      source: sourceTable,
      scanned: rows.length,
      inserted,
      skipped,
    };
  }

  async syncContacts(): Promise<SyncResult> {
    const sourceTable = 'contacts';
    const sourceType = 'contact';

    const rows = await this.prisma.contacts.findMany({
      orderBy: { created_at: 'asc' },
    });

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const alreadySynced = await this.prisma.lead_sync_logs.findUnique({
        where: {
          source_table_source_row_id: {
            source_table: sourceTable,
            source_row_id: BigInt(row.id),
          },
        },
      });

      if (alreadySynced) {
        skipped++;
        continue;
      }

      const remark = [row.subject, row.message].filter(Boolean).join(' - ') || null;

      const lead = await this.prisma.leads.create({
        data: {
          lead_code: 'TEMP',
          source_type: sourceType as any,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),

          name: row.first_name || 'Unknown',
          email: row.email || null,
          contact_no: row.phone_number || null,

          destination: null,
          travel_date: null,
          travellers_count: null,
          budget: null,
          source: 'Contact Form',
          remark,

          status: 'new' as any,
          follow_up_status: 'pending' as any,

          raw_payload: this.toJsonString(row),
        },
      });

      const leadCode = this.generateLeadCode(lead.id);
      await this.prisma.leads.update({
        where: { id: lead.id },
        data: { lead_code: leadCode },
      });

      await this.prisma.lead_sync_logs.create({
        data: {
          source_type: sourceType,
          source_table: sourceTable,
          source_row_id: BigInt(row.id),
          lead_id: lead.id,
        },
      });

      await this.prisma.lead_activities.create({
        data: {
          lead_id: lead.id,
          activity_type: 'created' as any,
          note: `Lead synced from ${sourceTable}`,
        },
      });

      inserted++;
    }

    return {
      source: sourceTable,
      scanned: rows.length,
      inserted,
      skipped,
    };
  }

  private generateLeadCode(id: bigint | number): string {
    const year = new Date().getFullYear();
    const numericId = typeof id === 'bigint' ? Number(id) : id;
    return `LED-${year}-${String(numericId).padStart(6, '0')}`;
  }

  private toJsonString(row: unknown): string {
    return JSON.stringify(row, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
  }
}
