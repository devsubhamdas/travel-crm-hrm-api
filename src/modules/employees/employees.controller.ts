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
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';


@Controller('crm/employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  getEmployees(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.employeesService.getEmployees(req.user, {
      page,
      limit,
      search,
      role,
      status,
      sort, 
      order
    });
  }

  @Get('staff-list')
  getStaffList(@Req() req: any, @Query('role') role?: string) {
    return this.employeesService.getStaffList(req.user, role);
  }

  @Get(':id')
  getEmployeeById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.employeesService.getEmployeeById(id, req.user);
  }

  @Post()
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() req: any) {
    return this.employeesService.createEmployee(dto, req.user);
  }

  @Patch(':id')
  updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    return this.employeesService.updateEmployee(id, dto, req.user);
  }
}