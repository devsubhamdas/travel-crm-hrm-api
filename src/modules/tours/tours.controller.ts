import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { ApiResponse } from 'src/common/types/index.type';
import { ToursService } from './tours.service';
import { RolesGuard } from 'src/common/guards/roles/roles.guard';
import { Roles } from 'src/common/decorators/roles/roles.decorator';
import { users_role } from 'src/generated/prisma/enums';

@Controller('crm/tours')
export class ToursController {
  constructor(private tourService: ToursService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin, users_role.manager, users_role.operator)
  @Get()
  async getTours(): Promise<ApiResponse> {
    const result = await this.tourService.getTours();
    return {
      success: true,
      message: 'Tours fetched successfully',
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin, users_role.manager, users_role.operator)
  @Get('departures')
  async getTourDepartures(
    @Query('status') status?: string,
    @Query('status') seats?: string,
  ): Promise<ApiResponse> {
    const result = await this.tourService.getTourDepartures({ status, seats });
    return {
      success: true,
      message: 'Tour departures fetched successfully',
      data: result,
    };
  }
}
