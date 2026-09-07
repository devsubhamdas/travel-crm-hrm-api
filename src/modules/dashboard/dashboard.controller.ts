import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { ApiResponse } from 'src/common/types/index.type';
import { LeadsService } from '../leads/leads.service';

@Controller('crm/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly leadService: LeadsService) {}

  @Get('leads-summary')
  async getLeadsSummary(@Query('date') date?: Date | 'today', @Query('startDate') startDate?: Date, @Query('endDate') endDate?: Date): Promise<ApiResponse> {
    const data = await this.leadService.getLeadsSummary({date, startDate, endDate});
    return {
      success: true,
      message: 'leads summary fetched successfully',
      data,
    };
  }

  @Get('leads-followups-summary')
  async getFollowupsSummary(
    @Query('status') status?: 'pending' | 'done' | 'rescheduled' | 'missed',
    @Query('date') date?: Date | 'today' | 'all',
  ): Promise<ApiResponse> {
    const data = await this.leadService.getLeadsFollowupsSummary({
      status: status as string,
      date,
    });
    return {
      success: true,
      message: 'leads follow-ups summary fetched successfully',
      data,
    };
  }
}
