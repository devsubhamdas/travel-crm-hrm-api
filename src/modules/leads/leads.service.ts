import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GetLeadsDto } from './dto/get-leads.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { GetFollowupsDto } from './dto/get-followups-dto';
import { UpdateLeadDto } from './dto/update-lead-dto';

// import { CreateLeadDto } from './dto/create-lead.dto';
// import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  // create(createLeadDto: CreateLeadDto) {
  //   return 'This action adds a new lead';
  // }
  constructor(private readonly prisma: PrismaService) {}

  async getLeads(query: GetLeadsDto, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { contact_no: { contains: query.search } },
        { destination: { contains: query.search } },
        { lead_code: { contains: query.search } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.source) where.source_type = query.source;
    if (query.departure_type) where.departure_type = query.departure_type;
    if (query.assignedAgentId) where.assigned_agent_id = BigInt(query.assignedAgentId);

    const currentRole = String(user?.role || '').toLowerCase();

    if (currentRole === 'sales') {
      where.assigned_agent_id = BigInt(user.id);
    }

    const leads = await this.prisma.leads.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [query.sort || 'created_at']: query.order || 'desc',
      },
      select: {
        id: true,
        lead_code: true,
        name: true,
        email: true,
        contact_no: true,
        destination: true,
        travel_date: true,
        travellers_count: true,
        budget: true,
        source: true,
        source_type: true,
        departure_type: true,
        status: true,
        assigned_agent_id: true,
        assigned_agent_name: true,
        follow_up_status: true,
        follow_up_date: true,
        remark: true,
        created_at: true,
        updated_at: true,
      },
    });

    const total = await this.prisma.leads.count({ where });

    return {
      data: leads.map((lead) => ({
        ...lead,
        id: Number(lead.id),
        assigned_agent_id: lead.assigned_agent_id ? Number(lead.assigned_agent_id) : null,
        tour_id: (lead as any).tour_id ? Number((lead as any).tour_id) : null,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async assignLead(leadId: number, dto: AssignLeadDto, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const currentRole = String(user.role || '').toLowerCase();

    if (currentRole !== 'admin') {
      throw new ForbiddenException('Only admin can assign leads');
    }

    const lead = await this.prisma.leads.findUnique({
      where: { id: BigInt(leadId) },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const employee = await this.prisma.user.findUnique({
      where: { id: BigInt(dto.assignedAgentId) },
      select: { id: true, name: true, role: true, is_active: true },
    });

    if (!employee) {
      throw new BadRequestException('Assigned employee not found');
    }

    if (!employee.is_active) {
      throw new BadRequestException('Assigned employee is inactive');
    }

    const employeeRole = employee.role ?? '';

    if (!['sales', 'admin'].includes(employeeRole)) {
      throw new BadRequestException('Lead can only be assigned to sales/admin');
    }

    let assignedAgentName =
      dto.assignedAgentName?.trim() ||
      employee.name?.trim() ||
      `User ${employee.id.toString()}` ||
      '';

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedLead = await tx.leads.update({
        where: { id: BigInt(leadId) },
        data: {
          assigned_agent_id: BigInt(dto.assignedAgentId),
          assigned_agent_name: assignedAgentName,
          follow_up_date: dto.followupDate ? new Date(dto.followupDate) : null,
          updated_at: new Date(),
        },
      });

      // if no lead-followups then create new or else update
      const is_lead_follow_up_exists = await tx.lead_follow_ups.findFirst({
        where: {
          lead_id: leadId,
        },
      });
      if (!is_lead_follow_up_exists)
        await tx.lead_follow_ups.create({
          data: {
            lead_id: leadId,
            follow_up_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days later
            status: 'pending',
            created_by: BigInt(user.id),
          },
        });

      await tx.lead_activities.create({
        data: {
          lead_id: BigInt(leadId),
          activity_type: 'assigned',
          old_value: lead.assigned_agent_id
            ? JSON.stringify({
                assigned_agent_id: Number(lead.assigned_agent_id),
                assigned_agent_name: lead.assigned_agent_name,
              })
            : null,
          new_value: JSON.stringify({
            assigned_agent_id: dto.assignedAgentId,
            assigned_agent_name: assignedAgentName,
          }),
          note: dto.note || `Lead assigned to ${assignedAgentName}`,
          created_by: BigInt(user.id),
        },
      });

      return updatedLead;
    });

    return {
      message: 'Lead assigned successfully',
      data: {
        ...updated,
        id: Number(updated.id),
        assigned_agent_id: updated.assigned_agent_id ? Number(updated.assigned_agent_id) : null,
      },
    };
  }

  async updateLeadStatus(leadId: number, dto: UpdateLeadStatusDto, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const leadIdBigInt = BigInt(leadId);

    const lead = await this.prisma.leads.findUnique({
      where: { id: leadIdBigInt },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const currentRole = String(user.role || '').toLowerCase();
    if (currentRole !== 'sales') {
      throw new ForbiddenException('Only sales can use this endpoint');
    }

    if (!lead.assigned_agent_id || Number(lead.assigned_agent_id) !== Number(user.id)) {
      throw new ForbiddenException('You can update only your assigned leads');
    }

    const currentStatus = String(lead.status || '').toLowerCase();
    const nextStatus = String(dto.status || '').toLowerCase();

    if (!nextStatus) {
      throw new BadRequestException('New status is required');
    }

    const allowedTransitions = this.getAllowedSalesTransitions();

    if (currentStatus !== nextStatus) {
      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(nextStatus)) {
        throw new BadRequestException(
          `Invalid status transition: ${currentStatus} -> ${nextStatus}`,
        );
      }
    }

    // sales must provide note when marking lost or closed
    if (['lost', 'closed'].includes(nextStatus) && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when marking a lead as lost or closed');
    }

    const nextFollowUpStatus = this.resolveLeadFollowUpStatusForStatusChange(
      nextStatus,
      dto.followUpStatus,
      lead.follow_up_status as string | null,
    );

    const nextFollowUpDate = this.resolveLeadFollowUpDateForStatusChange(
      nextStatus,
      dto.followUpDate,
      lead.follow_up_date,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedLead = await tx.leads.update({
        where: { id: leadIdBigInt },
        data: {
          status: dto.status as any,
          follow_up_status: nextFollowUpStatus as any,
          follow_up_date: nextFollowUpDate,
          updated_at: new Date(),
        },
      });

      if (['lost', 'closed', 'converted'].includes(nextStatus)) {
        await this.closeOpenFollowUps(
          tx,
          leadIdBigInt,
          dto.note?.trim() || `Lead moved to ${nextStatus}`,
        );
      }

      await tx.lead_follow_ups.create({
        data: {
          lead_id: leadIdBigInt,
          follow_up_date: nextFollowUpDate,
          status: this.resolveFollowUpRowStatus(nextFollowUpStatus, false),
          note: dto.note?.trim() || `Lead status changed from ${currentStatus} to ${nextStatus}`,
          created_by: BigInt(user.id),
        },
      });

      await tx.lead_activities.create({
        data: {
          lead_id: leadIdBigInt,
          activity_type: 'status_changed',
          old_value: JSON.stringify({
            status: currentStatus,
            follow_up_status: lead.follow_up_status,
            follow_up_date: lead.follow_up_date,
          }),
          new_value: JSON.stringify({
            status: nextStatus,
            follow_up_status: nextFollowUpStatus,
            follow_up_date: nextFollowUpDate,
          }),
          note: dto.note?.trim() || `Lead status changed from ${currentStatus} to ${nextStatus}`,
          created_by: BigInt(user.id),
        },
      });

      return updatedLead;
    });

    return {
      message: 'Lead status updated successfully',
      data: this.mapLeadResponse(updated),
    };
  }
  async adminUpdateLeadStatus(leadId: number, dto: UpdateLeadStatusDto, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const currentRole = String(user.role || '').toLowerCase();
    if (currentRole !== 'admin') {
      throw new ForbiddenException('Only admin can update lead status freely');
    }

    const leadIdBigInt = BigInt(leadId);

    const lead = await this.prisma.leads.findUnique({
      where: { id: leadIdBigInt },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const currentStatus = String(lead.status || '').toLowerCase();
    const nextStatus = String(dto.status || '').toLowerCase();

    if (!nextStatus) {
      throw new BadRequestException('New status is required');
    }

    const isReopeningDeadLead =
      ['lost', 'closed'].includes(currentStatus) &&
      !['lost', 'closed'].includes(nextStatus) &&
      currentStatus !== nextStatus;

    // admin note required only when reopening lost/closed
    if (isReopeningDeadLead && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when reopening a lost or closed lead');
    }

    if (currentStatus === nextStatus) {
      return {
        message: 'Lead status is already up to date',
        data: this.mapLeadResponse(lead),
      };
    }

    const nextFollowUpStatus = this.resolveLeadFollowUpStatusForStatusChange(
      nextStatus,
      dto.followUpStatus ?? (isReopeningDeadLead ? 'follow_up_needed' : undefined),
      lead.follow_up_status as string | null,
    );

    const nextFollowUpDate = this.resolveLeadFollowUpDateForStatusChange(
      nextStatus,
      dto.followUpDate,
      lead.follow_up_date,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedLead = await tx.leads.update({
        where: { id: leadIdBigInt },
        data: {
          status: dto.status as any,
          follow_up_status: nextFollowUpStatus as any,
          follow_up_date: nextFollowUpDate,
          updated_at: new Date(),
        },
      });

      if (['lost', 'closed', 'converted'].includes(nextStatus)) {
        await this.closeOpenFollowUps(
          tx,
          leadIdBigInt,
          dto.note?.trim() || `Lead moved to ${nextStatus} by admin`,
        );
      }

      await tx.lead_follow_ups.create({
        data: {
          lead_id: leadIdBigInt,
          follow_up_date: nextFollowUpDate,
          status: this.resolveFollowUpRowStatus(nextFollowUpStatus, isReopeningDeadLead),
          note:
            dto.note?.trim() || `Admin changed lead status from ${currentStatus} to ${nextStatus}`,
          created_by: BigInt(user.id),
        },
      });

      await tx.lead_activities.create({
        data: {
          lead_id: leadIdBigInt,
          activity_type: 'status_changed',
          old_value: JSON.stringify({
            status: currentStatus,
            follow_up_status: lead.follow_up_status,
            follow_up_date: lead.follow_up_date,
          }),
          new_value: JSON.stringify({
            status: nextStatus,
            follow_up_status: nextFollowUpStatus,
            follow_up_date: nextFollowUpDate,
          }),
          note:
            dto.note?.trim() || `Admin changed lead status from ${currentStatus} to ${nextStatus}`,
          created_by: BigInt(user.id),
        },
      });

      return updatedLead;
    });

    return {
      message: 'Lead status updated successfully by admin',
      data: this.mapLeadResponse(updated),
    };
  }

  async addFollowupNote(followupId: number, note: string) {
    if (!followupId || !note) throw new BadRequestException('follow-up id or note is missing');

    const result = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead_follow_ups.update({
        where: { id: BigInt(followupId) },
        data: {
          note,
          status: 'done',
        },
      });
      await tx.leads.update({
        where: {
          id: BigInt(result.lead_id),
        },
        data: {
          follow_up_status: 'completed',
        },
      });
      return result;
    });

    if (!result) {
      throw new NotFoundException('follow-up not found');
    }

    return result;
  }

  async updateFollowUp(leadId: number, dto: UpdateFollowUpDto, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const leadIdBigInt = BigInt(leadId);

    const lead = await this.prisma.leads.findUnique({
      where: { id: leadIdBigInt },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const currentRole = String(user.role || '').toLowerCase();

    // 1. Permission Check
    if (currentRole === 'sales') {
      if (!lead.assigned_agent_id || Number(lead.assigned_agent_id) !== Number(user.id)) {
        throw new ForbiddenException('You can update follow-up only for your assigned leads');
      }
    }

    // 2. Logic Check: Check for unresolved (Missed/Pending) tasks in the past
    const unresolvedTask = await this.prisma.lead_follow_ups.findFirst({
      where: {
        lead_id: leadIdBigInt,
        status: { in: ['pending', 'missed'] },
        follow_up_date: { lt: new Date() }, // It was supposed to happen before "now"
      },
    });

    // If they have a missed task but didn't provide a note explaining the result
    if (unresolvedTask && !dto.note) {
      throw new BadRequestException(
        'A note is required to resolve the previous missed follow-up before scheduling a new one.',
      );
    }

    const followUpDateValue = dto.followUpDate ? new Date(dto.followUpDate) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 3. Resolve existing tasks (The "Cleanup" step)
      // If there is an old task, mark it as 'done' so it doesn't stay 'pending' forever
      if (unresolvedTask) {
        await tx.lead_follow_ups.update({
          where: { id: unresolvedTask.id },
          data: {
            status: 'done',
            note: `[Previous Task Resolved]: ${dto.note}`,
            updated_at: new Date(),
          },
        });
      }

      // 4. Update the Lead Table (The Current State)
      const updatedLead = await tx.leads.update({
        where: { id: leadIdBigInt },
        data: {
          follow_up_status: dto.followUpStatus as any,
          follow_up_date: followUpDateValue,
          updated_at: new Date(),
        },
      });

      // 5. Create the NEW Task (The Future State)
      await tx.lead_follow_ups.create({
        data: {
          lead_id: leadIdBigInt,
          follow_up_date: followUpDateValue,
          status:
            dto.followUpStatus === 'completed' || dto.followUpStatus === 'not_required'
              ? 'done'
              : dto.followUpStatus === 'follow_up_needed'
                ? 'missed'
                : 'pending',
          note: dto.note || null,
          created_by: BigInt(user.id),
        },
      });

      // 6. Log the Activity
      await tx.lead_activities.create({
        data: {
          lead_id: leadIdBigInt,
          activity_type: 'follow_up',
          old_value: JSON.stringify({
            follow_up_status: lead.follow_up_status,
            follow_up_date: lead.follow_up_date,
          }),
          new_value: JSON.stringify({
            follow_up_status: dto.followUpStatus,
            follow_up_date: followUpDateValue,
          }),
          note: dto.note || `Follow-up updated to ${dto.followUpStatus}`,
          created_by: BigInt(user.id),
        },
      });

      return updatedLead;
    });

    return {
      message: 'Follow-up processed and rescheduled successfully',
      data: {
        ...updated,
        id: Number(updated.id),
        assigned_agent_id: updated.assigned_agent_id ? Number(updated.assigned_agent_id) : null,
      },
    };
  }
  async getLeadActivities(leadId: number, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const lead = await this.prisma.leads.findUnique({
      where: { id: BigInt(leadId) },
      select: {
        id: true,
        lead_code: true,
        name: true,
        status: true,
        assigned_agent_id: true,
        assigned_agent_name: true,
        follow_up_status: true,
        follow_up_date: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const currentRole = String(user.role || '').toLowerCase();

    // sales can only view activities of their assigned leads
    if (currentRole === 'sales') {
      if (!lead.assigned_agent_id || Number(lead.assigned_agent_id) !== Number(user.id)) {
        throw new ForbiddenException('You can view activities only for your assigned leads');
      }
    }

    const [activities, followUps] = await Promise.all([
      this.prisma.lead_activities.findMany({
        where: { lead_id: BigInt(leadId) },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          lead_id: true,
          activity_type: true,
          old_value: true,
          new_value: true,
          note: true,
          created_by: true,
          created_at: true,
        },
      }),
      this.prisma.lead_follow_ups.findMany({
        where: { lead_id: BigInt(leadId) },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          lead_id: true,
          follow_up_date: true,
          status: true,
          note: true,
          created_by: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);

    // merge into one timeline for drawer UI
    const timeline = [
      ...activities.map((item) => ({
        id: `activity-${item.id.toString()}`,
        type: 'activity',
        activityType: item.activity_type,
        title: this.getActivityTitle(item.activity_type),
        note: item.note,
        oldValue: this.safeParseJson(item.old_value),
        newValue: this.safeParseJson(item.new_value),
        createdBy: item.created_by ? Number(item.created_by) : null,
        createdAt: item.created_at,
        sortDate: item.created_at,
      })),
      ...followUps.map((item) => ({
        id: `followup-${item.id.toString()}`,
        type: 'follow_up',
        activityType: 'follow_up',
        title: 'Follow-up update',
        note: item.note,
        followUpStatus: item.status,
        followUpDate: item.follow_up_date,
        createdBy: item.created_by ? Number(item.created_by) : null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        sortDate: item.created_at,
      })),
    ].sort((a, b) => {
      const aTime = a.sortDate ? new Date(a.sortDate).getTime() : 0;
      const bTime = b.sortDate ? new Date(b.sortDate).getTime() : 0;
      return bTime - aTime;
    });

    return {
      lead: {
        id: Number(lead.id),
        lead_code: lead.lead_code,
        name: lead.name,
        status: lead.status,
        assigned_agent_id: lead.assigned_agent_id ? Number(lead.assigned_agent_id) : null,
        assigned_agent_name: lead.assigned_agent_name,
        follow_up_status: lead.follow_up_status,
        follow_up_date: lead.follow_up_date,
      },
      activities: activities.map((item) => ({
        ...item,
        id: Number(item.id),
        lead_id: Number(item.lead_id),
        created_by: item.created_by ? Number(item.created_by) : null,
        old_value: this.safeParseJson(item.old_value),
        new_value: this.safeParseJson(item.new_value),
      })),
      followUps: followUps.map((item) => ({
        ...item,
        id: Number(item.id),
        lead_id: Number(item.lead_id),
        created_by: item.created_by ? Number(item.created_by) : null,
      })),
      timeline,
    };
  }

  async getLeadById(leadId: number, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const lead = await this.prisma.leads.findUnique({
      where: { id: BigInt(leadId) },
      select: {
        id: true,
        lead_code: true,
        source_type: true,
        source_table: true,
        source_row_id: true,

        name: true,
        email: true,
        contact_no: true,

        destination: true,
        travel_date: true,
        travellers_count: true,
        budget: true,
        source: true,
        departure_type: true,
        remark: true,

        status: true,
        assigned_agent_id: true,
        assigned_agent_name: true,

        follow_up_status: true,
        follow_up_date: true,

        tour_id: true,
        raw_payload: true,

        created_at: true,
        updated_at: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const currentRole = String(user.role || '').toLowerCase();

    // sales can only view their assigned leads
    if (currentRole === 'sales') {
      if (!lead.assigned_agent_id || Number(lead.assigned_agent_id) !== Number(user.id)) {
        throw new ForbiddenException('You can view only your assigned leads');
      }
    }

    return {
      data: {
        ...lead,
        id: Number(lead.id),
        source_row_id: Number(lead.source_row_id),
        assigned_agent_id: lead.assigned_agent_id ? Number(lead.assigned_agent_id) : null,
        tour_id: lead.tour_id ? Number(lead.tour_id) : null,
      },
    };
  }

  async createLead(dto: CreateLeadDto, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const currentRole = String(user.role || '').toLowerCase();

    // only staff can manually create leads
    if (!['admin', 'sales', 'operator'].includes(currentRole)) {
      throw new ForbiddenException('You are not allowed to create leads');
    }

    let assignedAgentId: bigint | null = null;
    let assignedAgentName: string | null = null;

    if (dto.assigned_agent_id) {
      const employee = await this.prisma.user.findUnique({
        where: { id: BigInt(dto.assigned_agent_id) },
        select: { id: true, name: true, role: true, is_active: true },
      });

      if (!employee) {
        throw new BadRequestException('Assigned employee not found');
      }

      if (!employee.is_active) {
        throw new BadRequestException('Assigned employee is inactive');
      }

      const employeeRole = String(employee.role || '').toLowerCase();
      if (!['admin', 'sales', 'operator'].includes(employeeRole)) {
        throw new BadRequestException('Lead can be assigned only to staff');
      }

      assignedAgentId = BigInt(dto.assigned_agent_id);
      assignedAgentName =
        dto.assigned_agent_name?.trim() ||
        employee.name?.trim() ||
        `User ${employee.id.toString()}`;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.leads.create({
        data: {
          lead_code: 'TEMP',
          source_type: (dto.source_type || 'manual') as any,
          source_table: (dto.source || 'manual') as any,
          source_row_id: BigInt(0),
          departure_type: dto.departure_type || 'others',

          name: dto.name.trim(),
          email: dto.email?.trim() || null,
          contact_no: dto.contact_no?.trim() || null,

          destination: dto.destination?.trim() || null,
          travel_date: dto.travel_date ? new Date(dto.travel_date) : null,
          travellers_count: dto.travellers_count ?? null,
          budget: dto.budget?.trim() || null,
          source: dto.source?.trim() || 'Manual',
          remark: dto.remark?.trim() || null,

          status: (dto.status || 'new') as any,
          assigned_agent_id: assignedAgentId,
          assigned_agent_name: assignedAgentName,
          follow_up_status: (dto.follow_up_status || 'pending') as any,
          follow_up_date: dto.follow_up_date ? new Date(dto.follow_up_date) : null,

          raw_payload: JSON.stringify({
            created_manually: true,
            created_by_user_id: user.id,
            created_by_role: user.role,
          }),
        },
      });

      const leadCode = this.generateLeadCode(lead.id);

      const updatedLead = await tx.leads.update({
        where: { id: lead.id },
        data: { lead_code: leadCode },
      });

      await tx.lead_activities.create({
        data: {
          lead_id: lead.id,
          activity_type: 'created',
          note: `Lead created manually by ${currentRole}`,
          created_by: BigInt(user.id),
        },
      });

      if (assignedAgentId) {
        await tx.lead_activities.create({
          data: {
            lead_id: lead.id,
            activity_type: 'assigned',
            new_value: JSON.stringify({
              assigned_agent_id: Number(assignedAgentId),
              assigned_agent_name: assignedAgentName,
            }),
            note: `Lead assigned during creation to ${assignedAgentName}`,
            created_by: BigInt(user.id),
          },
        });
      }

      if (dto.follow_up_date || dto.follow_up_status) {
        await tx.lead_follow_ups.create({
          data: {
            lead_id: lead.id,
            follow_up_date: dto.follow_up_date ? new Date(dto.follow_up_date) : null,
            status:
              dto.follow_up_status === 'completed'
                ? 'done'
                : dto.follow_up_status === 'scheduled'
                  ? 'pending'
                  : dto.follow_up_status === 'follow_up_needed'
                    ? 'rescheduled'
                    : dto.follow_up_status === 'not_required'
                      ? 'done'
                      : 'pending',
            note: dto.remark?.trim() || 'Initial follow-up created with manual lead',
            created_by: BigInt(user.id),
          },
        });
      }

      return updatedLead;
    });

    return {
      message: 'Lead created successfully',
      data: {
        ...created,
        id: Number(created.id),
        source_row_id: Number(created.source_row_id),
        assigned_agent_id: created.assigned_agent_id ? Number(created.assigned_agent_id) : null,
        tour_id: created.tour_id ? Number(created.tour_id) : null,
      },
    };
  }

  private generateLeadCode(id: bigint | number): string {
    const numericId = Number(id);

    const year = new Date().getFullYear();

    const paddedId = numericId.toString().padStart(6, '0');

    return `LED-${year}-${paddedId}`;
  }

  private safeParseJson(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private getActivityTitle(activityType: string) {
    switch (activityType) {
      case 'assigned':
        return 'Lead assigned';
      case 'status_changed':
        return 'Status changed';
      case 'follow_up':
        return 'Follow-up updated';
      case 'remark_added':
        return 'Remark added';
      case 'converted':
        return 'Lead converted';
      case 'updated':
        return 'Lead updated';
      case 'created':
        return 'Lead created';
      default:
        return 'Activity';
    }
  }
  findAll() {
    return `This action returns all leads`;
  }

  findOne(id: number) {
    return `This action returns a #${id} lead`;
  }

  // update(id: number, updateLeadDto: UpdateLeadDto) {
  //   return `This action updates a #${id} lead`;
  // }

  remove(id: number) {
    return `This action removes a #${id} lead`;
  }

  async updateLead(leadId: number, dto: UpdateLeadDto, user: any) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const currentRole = String(user.role || '').toLowerCase();
    if (currentRole !== 'admin') {
      throw new ForbiddenException('Only admin can update leads');
    }

    const lead = await this.prisma.leads.findUnique({
      where: { id: BigInt(leadId) },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    let assignedAgentId: bigint | null | undefined = undefined;
    let assignedAgentName: string | null | undefined = undefined;

    if (dto.assigned_agent_id !== undefined) {
      if (dto.assigned_agent_id === (null as any)) {
        assignedAgentId = null;
        assignedAgentName = null;
      } else {
        const employee = await this.prisma.user.findUnique({
          where: { id: BigInt(dto.assigned_agent_id) },
          select: { id: true, name: true, role: true, is_active: true },
        });

        if (!employee) {
          throw new BadRequestException('Assigned employee not found');
        }

        if (!employee.is_active) {
          throw new BadRequestException('Assigned employee is inactive');
        }

        const employeeRole = String(employee.role || '').toLowerCase();
        if (!['admin', 'sales', 'operator'].includes(employeeRole)) {
          throw new BadRequestException('Lead can be assigned only to staff');
        }

        assignedAgentId = BigInt(dto.assigned_agent_id);
        assignedAgentName =
          dto.assigned_agent_name?.trim() ||
          employee.name?.trim() ||
          `User ${employee.id.toString()}`;
      }
    }

    const oldValue = {
      name: lead.name,
      email: lead.email,
      contact_no: lead.contact_no,
      destination: lead.destination,
      travel_date: lead.travel_date,
      travellers_count: lead.travellers_count,
      budget: lead.budget,
      source: lead.source,
      remark: lead.remark,
      status: lead.status,
      assigned_agent_id: lead.assigned_agent_id ? Number(lead.assigned_agent_id) : null,
      assigned_agent_name: lead.assigned_agent_name,
      follow_up_status: lead.follow_up_status,
      follow_up_date: lead.follow_up_date,
    };

    const data: any = {
      updated_at: new Date(),
    };

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.contact_no !== undefined) data.contact_no = dto.contact_no || null;
    if (dto.destination !== undefined) data.destination = dto.destination || null;
    if (dto.travel_date !== undefined)
      data.travel_date = dto.travel_date ? new Date(dto.travel_date) : null;
    if (dto.travellers_count !== undefined) data.travellers_count = dto.travellers_count;
    if (dto.budget !== undefined) data.budget = dto.budget || null;
    if (dto.source_type !== undefined) data.source_type = dto.source_type || 'manual';
    if (dto.source !== undefined) data.source = dto.source || 'manual';
    if (dto.departure_type !== undefined) data.departure_type = dto.departure_type || 'others';
    if (dto.remark !== undefined) data.remark = dto.remark || null;
    if (dto.status !== undefined) data.status = dto.status as any;
    if (dto.follow_up_status !== undefined) data.follow_up_status = dto.follow_up_status as any;
    if (dto.follow_up_date !== undefined)
      data.follow_up_date = dto.follow_up_date ? new Date(dto.follow_up_date) : null;

    if (assignedAgentId !== undefined) {
      data.assigned_agent_id = assignedAgentId;
      data.assigned_agent_name = assignedAgentName;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedLead = await tx.leads.update({
        where: { id: BigInt(leadId) },
        data,
      });

      await tx.lead_activities.create({
        data: {
          lead_id: BigInt(leadId),
          activity_type: 'updated',
          old_value: JSON.stringify(oldValue),
          new_value: JSON.stringify({
            name: updatedLead.name,
            email: updatedLead.email,
            contact_no: updatedLead.contact_no,
            destination: updatedLead.destination,
            travel_date: updatedLead.travel_date,
            travellers_count: updatedLead.travellers_count,
            budget: updatedLead.budget,
            source: updatedLead.source,
            remark: updatedLead.remark,
            status: updatedLead.status,
            assigned_agent_id: updatedLead.assigned_agent_id
              ? Number(updatedLead.assigned_agent_id)
              : null,
            assigned_agent_name: updatedLead.assigned_agent_name,
            follow_up_status: updatedLead.follow_up_status,
            follow_up_date: updatedLead.follow_up_date,
          }),
          note: dto.note || 'Lead updated by admin',
          created_by: BigInt(user.id),
        },
      });

      if (dto.follow_up_status !== undefined || dto.follow_up_date !== undefined) {
        await tx.lead_follow_ups.create({
          data: {
            lead_id: BigInt(leadId),
            follow_up_date: dto.follow_up_date ? new Date(dto.follow_up_date) : null,
            status:
              dto.follow_up_status === 'completed' || dto.follow_up_status === 'not_required'
                ? 'done'
                : dto.follow_up_status === 'follow_up_needed'
                  ? 'missed'
                  : 'pending',
            note: dto.note || 'Lead updated by admin',
            created_by: BigInt(user.id),
          },
        });
      }

      return updatedLead;
    });

    return {
      message: 'Lead updated successfully',
      data: {
        ...updated,
        id: Number(updated.id),
        source_row_id: Number(updated.source_row_id),
        assigned_agent_id: updated.assigned_agent_id ? Number(updated.assigned_agent_id) : null,
        tour_id: updated.tour_id ? Number(updated.tour_id) : null,
      },
    };
  }

  async getFollowups(query: GetFollowupsDto, user: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.follow_up_date) where.follow_up_date = new Date(query.follow_up_date);

    // Build leads filter (search + agent scope merged into one block)
    const leadsFilter: any = {};

    if (user.role !== 'admin') {
      leadsFilter.assigned_agent_id = BigInt(user.id);
    }

    if (query.assigned_agent_id) {
      leadsFilter.assigned_agent_id = BigInt(query.assigned_agent_id);
    }

    if (query.search) {
      leadsFilter.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { contact_no: { contains: query.search } },
        { destination: { contains: query.search } },
        { lead_code: { contains: query.search } },
        { assigned_agent_name: { contains: query.search } },
      ];
    }

    if (Object.keys(leadsFilter).length > 0) {
      where.leads = leadsFilter;
    }

    // Map frontend field names to actual DB field names
    const fieldMap: Record<string, string> = {
      customer_name: 'name',
      // add more mappings here if needed
    };

    // Build orderBy
    const sortField = fieldMap[query.sort || 'created_at'] ?? query.sort ?? 'follow_up_date';
    const sortOrder = query.order || 'desc';

    // Fields that belong to the leads relation
    const leadFields = [
      'name',
      'email',
      'destination',
      'travel_date',
      'status',
      'assigned_agent_name',
    ];

    const orderBy = leadFields.includes(sortField)
      ? { leads: { [sortField]: sortOrder } } // relational sort
      : { [sortField]: sortOrder }; // local sort

    const followups = await this.prisma.lead_follow_ups.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        leads: {
          select: {
            id: true,
            lead_code: true,
            name: true,
            email: true,
            contact_no: true,
            destination: true,
            travel_date: true,
            status: true,
            assigned_agent_id: true,
            assigned_agent_name: true,
            follow_up_status: true,
          },
        },
      },
      orderBy,
    });

    const total = await this.prisma.lead_follow_ups.count({ where });

    return {
      followups,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getLeadsSummary(query?: { date?: Date | 'today'; startDate?: Date; endDate?: Date }) {
    const ALL_STATUSES = [
      'new',
      'contacted',
      'qualified',
      'quoted',
      'converted',
      'lost',
      'closed',
    ] as const;

    const ALL_SOURCE_TYPES = [
      'trip_lead',
      'enquiry',
      'itinerary',
      'contact',
      'manual',
      'walk_in',
      'referral',
      'whatsapp',
      'call',
      'email',
      'media_ad',
      'social_ad',
      'twak_to',
      'datasheet',
    ] as const;

    // Build date filter
    let dateFilter = {};

    if (query?.startDate && query?.endDate) {
      // Range filter
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        created_at: {
          gte: start,
          lte: end,
        },
      };
    } else if (query?.date) {
      let baseDate: Date;

      if (query.date === 'today') {
        baseDate = new Date();
      } else {
        baseDate = new Date(query.date);
      }

      if (!isNaN(baseDate.getTime())) {
        const start = new Date(baseDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(baseDate);
        end.setHours(23, 59, 59, 999);

        dateFilter = {
          created_at: {
            gte: start,
            lte: end,
          },
        };
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      total,
      byStatus,
      bySourceType,
      todays_followups,
      overdue_raw,
      todays_followups_count,
      recent_leads,
    ] = await this.prisma.$transaction([
      this.prisma.leads.count({ where: dateFilter }),
      this.prisma.leads.groupBy({
        by: ['status'],
        where: dateFilter,
        orderBy: {
          status: 'asc', // or 'desc'
        },
        _count: { status: true },
      }),
      this.prisma.leads.groupBy({
        by: ['source_type'],
        where: dateFilter,
        orderBy: { source_type: 'asc' },
        _count: { source_type: true },
      }),
      this.prisma.leads.findMany({
        where: {
          follow_up_date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          id: true,
          lead_code: true,
          name: true,
          destination: true,
          status: true,
          follow_up_date: true,
          follow_up_status: true,
          assigned_agent_name: true,
          remark: true,
        },
      }),
      this.prisma.lead_follow_ups.findMany({
        where: {
          status: 'missed',
        },
        select: {
          leads: {
            select: {
              id: true,
              lead_code: true,
              name: true,
              destination: true,
              status: true,
              follow_up_status: true,
              follow_up_date: true,
              assigned_agent_name: true,
              remark: true,
            },
          },
        },
      }),
      this.prisma.leads.count({
        where: {
          follow_up_date: {
            gte: todayEnd,
            lte: todayEnd,
          },
        },
      }),
      this.prisma.leads.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          lead_code: true,
          name: true,
          contact_no: true,
          destination: true,
          budget: true,
          source_type: true,
          status: true,
          follow_up_status: true,
          follow_up_date: true,
          assigned_agent_name: true,
          updated_at: true,
        },
      }),
    ]);

    // Initialize with all statuses = 0
    const statusCounts = ALL_STATUSES.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Status Normalize and Overwrite with actual DB values
    byStatus.forEach((item) => {
      const count = item._count && typeof item._count !== 'boolean' ? (item._count.status ?? 0) : 0;

      statusCounts[item.status] = count;
    });

    // Source type normalize
    const sourceTypeCounts = ALL_SOURCE_TYPES.reduce(
      (acc, type) => {
        acc[type] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    bySourceType.forEach((item) => {
      if (!item.source_type) return; // skip null
      const count =
        item._count && typeof item._count !== 'boolean' ? (item._count.source_type ?? 0) : 0;

      sourceTypeCounts[item.source_type] = count;
    });

    const conversionRate = total ? Number((statusCounts.converted / total).toFixed(2)) : 0;
    const overdue_leads = overdue_raw.map((item) => item.leads).filter(Boolean);
    return {
      total,
      todays_followups_count,
      count_by_status: statusCounts,
      count_by_source_type: sourceTypeCounts,
      conversion_rate: conversionRate,
      todays_followups,
      overdue_leads,
      recent_leads,
    };
  }

  async getLeadsFollowupsSummary(query?: { status?: string; date?: Date | 'today' | 'all' }) {
    let dateFilter = {};

    // Handle date logic
    if (query?.date && query.date !== 'all') {
      let baseDate: Date;

      if (query.date === 'today') {
        baseDate = new Date();
      } else {
        baseDate = new Date(query.date);
      }

      const startOfDay = new Date(baseDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(baseDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        follow_up_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    // If specific status requested
    if (query?.status) {
      const count = await this.prisma.lead_follow_ups.count({
        where: {
          status: query.status as any,
          ...dateFilter,
        },
      });

      return {
        [query.status]: count,
      };
    }

    // Default: return both
    const [missed, rescheduled, done, pending] = await this.prisma.$transaction([
      this.prisma.lead_follow_ups.count({
        where: {
          status: 'missed',
          ...dateFilter,
        },
      }),
      this.prisma.lead_follow_ups.count({
        where: {
          status: 'rescheduled',
          ...dateFilter,
        },
      }),
      this.prisma.lead_follow_ups.count({
        where: {
          status: 'done',
          ...dateFilter,
        },
      }),
      this.prisma.lead_follow_ups.count({
        where: {
          status: 'pending',
          ...dateFilter,
        },
      }),
    ]);

    return {
      count_by_status: {
        missed,
        rescheduled,
        done,
        pending,
      },
    };
  }

  private getAllowedSalesTransitions(): Record<string, string[]> {
    return {
      new: ['contacted', 'lost'],
      contacted: ['qualified', 'lost'],
      qualified: ['quoted', 'lost'],
      quoted: ['negotiation', 'converted', 'lost'],
      negotiation: ['quoted', 'booking_in_progress', 'converted', 'lost'],
      booking_in_progress: ['converted', 'lost'],
      converted: ['closed'],
      lost: [],
      closed: [],
    };
  }

  private mapLeadResponse(updated: any) {
    return {
      ...updated,
      id: Number(updated.id),
      assigned_agent_id: updated.assigned_agent_id ? Number(updated.assigned_agent_id) : null,
      source_row_id: Number(updated.source_row_id),
      tour_id: updated.tour_id ? Number(updated.tour_id) : null,
    };
  }

  private resolveLeadFollowUpStatusForStatusChange(
    nextStatus: string,
    dtoFollowUpStatus?: string | null,
    currentLeadFollowUpStatus?: string | null,
  ): 'pending' | 'follow_up_needed' | 'scheduled' | 'completed' | 'not_required' {
    const normalizedNextStatus = String(nextStatus || '').toLowerCase();

    if (normalizedNextStatus === 'lost' || normalizedNextStatus === 'closed') {
      return 'not_required';
    }

    if (normalizedNextStatus === 'converted') {
      return 'completed';
    }

    if (dtoFollowUpStatus) {
      return dtoFollowUpStatus as
        | 'pending'
        | 'follow_up_needed'
        | 'scheduled'
        | 'completed'
        | 'not_required';
    }

    if (
      ['new', 'contacted', 'qualified', 'quoted', 'negotiation', 'booking_in_progress'].includes(
        normalizedNextStatus,
      )
    ) {
      return currentLeadFollowUpStatus === 'completed' ||
        currentLeadFollowUpStatus === 'not_required'
        ? 'pending'
        : ((currentLeadFollowUpStatus || 'pending') as
            | 'pending'
            | 'follow_up_needed'
            | 'scheduled'
            | 'completed'
            | 'not_required');
    }

    return (currentLeadFollowUpStatus || 'pending') as
      | 'pending'
      | 'follow_up_needed'
      | 'scheduled'
      | 'completed'
      | 'not_required';
  }

  private resolveLeadFollowUpDateForStatusChange(
    nextStatus: string,
    dtoFollowUpDate?: string | Date | null,
    currentLeadFollowUpDate?: Date | null,
  ): Date | null {
    const normalizedNextStatus = String(nextStatus || '').toLowerCase();

    if (normalizedNextStatus === 'lost' || normalizedNextStatus === 'closed') {
      return null;
    }

    if (normalizedNextStatus === 'converted') {
      return null;
    }

    if (dtoFollowUpDate !== undefined) {
      return dtoFollowUpDate ? new Date(dtoFollowUpDate) : null;
    }

    return currentLeadFollowUpDate || null;
  }

  private resolveFollowUpRowStatus(
    leadFollowUpStatus: string,
    isReopenedLead = false,
  ): 'pending' | 'done' | 'missed' | 'rescheduled' {
    const normalized = String(leadFollowUpStatus || '').toLowerCase();

    if (normalized === 'completed' || normalized === 'not_required') {
      return 'done';
    }

    if (normalized === 'follow_up_needed') {
      return isReopenedLead ? 'rescheduled' : 'missed';
    }

    if (normalized === 'scheduled') {
      return isReopenedLead ? 'rescheduled' : 'pending';
    }

    return 'pending';
  }

  private async closeOpenFollowUps(tx: any, leadId: bigint, note: string) {
    await tx.lead_follow_ups.updateMany({
      where: {
        lead_id: leadId,
        status: { in: ['pending', 'missed', 'rescheduled'] },
      },
      data: {
        status: 'done',
        note,
        updated_at: new Date(),
      },
    });
  }
}
