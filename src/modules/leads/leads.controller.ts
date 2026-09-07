import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsSyncService } from './leads-sync.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { RolesGuard } from 'src/common/guards/roles/roles.guard';
import { Roles } from 'src/common/decorators/roles/roles.decorator';
import { users_role } from 'generated/prisma/enums';
import { CreateLeadDto } from './dto/create-lead.dto';
import type { Request } from 'express';
import { ApiResponse } from 'src/common/types/index.type';
import { GetFollowupsDto } from './dto/get-followups-dto';
import { UpdateLeadDto } from './dto/update-lead-dto';

@Controller('crm/leads')
export class LeadsController {
  constructor(
    private readonly leadsSyncService: LeadsSyncService,
    private leadsService: LeadsService,
  ) {}

  @Post('sync')
  async syncAll() {
    return this.leadsSyncService.syncAllSources();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getLeads(@Query() query: GetLeadsDto, @Req() req: any) {
    return this.leadsService.getLeads(query, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('follow-ups')
  async getFollowups(@Query() query: GetFollowupsDto, @Req() req: Request): Promise<ApiResponse> {
    const result = await this.leadsService.getFollowups(query, req.user);

    return {
      success: true,
      message: 'follow-ups fetched successfully',
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin)
  @Patch(':id/assign')
  async assignLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignLeadDto,
    @Req() req: any,
  ) {
    return this.leadsService.assignLead(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.sales)
  @Patch(':id/status')
  async updateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
    @Req() req: any,
  ) {
    return this.leadsService.updateLeadStatus(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin)
  @Patch(':id/admin-status')
  async adminUpdateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
    @Req() req: any,
  ) {
    return this.leadsService.adminUpdateLeadStatus(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.sales)
  @Patch(':id/follow-up')
  async updateFollowUp(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFollowUpDto,
    @Req() req: any,
  ) {
    return this.leadsService.updateFollowUp(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.sales)
  @Patch(':id/follow-up/add-note')
  async addFollowupNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: { note: string },
  ): Promise<ApiResponse> {
    const result = await this.leadsService.addFollowupNote(id, payload.note);
    return {
      success: true,
      message: 'follow-up note added successfully',
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/activities')
  async getLeadActivities(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.leadsService.getLeadActivities(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin, users_role.sales)
  @Get(':id')
  async getLeadById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.leadsService.getLeadById(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createLead(@Body() dto: CreateLeadDto, @Req() req: any) {
    return this.leadsService.createLead(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin, users_role.operator, users_role.sales)
  @Patch(':id')
  async updateLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
    @Req() req: any,
  ) {
    return this.leadsService.updateLead(id, dto, req.user);
  }
}
