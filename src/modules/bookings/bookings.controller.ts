import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';

import { GetBookingsDto } from './dto/get-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { UpdateBookingFollowUpDto } from './dto/update-booking-follow-up.dto';
import { UpdateBookingNotesDto } from './dto/update-booking-notes.dto';
import { RolesGuard } from 'src/common/guards/roles/roles.guard';
import { users_role } from 'generated/prisma/browser';
import { Roles } from 'src/common/decorators/roles/roles.decorator';
import { GetBookingFollowUpsDto } from './dto/get-booking-follow-ups.dto';
import { AddBookingTravellersDto } from './dto/add-booking-travellers.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ApiResponse } from 'src/common/types/index.type';
import type { Response } from 'express';

@Controller('crm/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(users_role.operator, users_role.admin, users_role.manager)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}
  @Get('follow-ups')
  getFollowUpBookings(@Req() req: any, @Query() query: GetBookingFollowUpsDto) {
    return this.bookingsService.getBookingFollowUps(req.user, query);
  }
  @Get()
  getBookings(@Req() req: any, @Query() query: GetBookingsDto) {
    return this.bookingsService.getBookings(req.user, query);
  }

  @Get(':id')
  getBookingById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.bookingsService.getBookingById(id, req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin, users_role.manager, users_role.operator)
  async createBooking(@Body() dto: CreateBookingDto): Promise<ApiResponse> {
    const result = await this.bookingsService.createBooking(dto);
    return {
      success: true,
      message: 'booking added successfully',
      data: result,
    };
  }

  @Patch(':id/status')
  updateBookingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: any,
  ) {
    return this.bookingsService.updateBookingStatus(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.operator)
  //for employees to add internal notes that are not visible to customers
  @Patch(':id/notes')
  updateBookingNotes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingNotesDto,
    @Req() req: any,
  ) {
    return this.bookingsService.updateBookingNotes(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin)
  // For employees to update follow-up status, date, and notes
  @Patch(':id/follow-up')
  updateBookingFollowUp(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingFollowUpDto,
    @Req() req: any,
  ) {
    return this.bookingsService.updateBookingFollowUp(id, dto, req.user);
  }

  @Get(':id/travellers')
  getBookingTravellers(@Param('id', ParseIntPipe) bookingId: number, @Req() req: any) {
    return this.bookingsService.getBookingTravellers(bookingId, req.user);
  }

  @Post(':id/travellers')
  addBookingTravellers(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() dto: AddBookingTravellersDto,
    @Req() req: any,
  ) {
    return this.bookingsService.addBookingTravellers(bookingId, dto, req.user);
  }
}
