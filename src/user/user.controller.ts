import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { UserService } from './user.service';
import { ApiResponse } from 'src/common/types/index.type';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundException('user not found');
    return {
      success: true,
      message: 'user fetched successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        contact_no: user.contact_no,
        role: user.role,
      },
    };
  }

  // @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(
    @Query('role') role?: string,
    @Query('is_active') is_active: boolean = true,
  ): Promise<ApiResponse> {
    const users = await this.userService.getUsers({ role, is_active });
    if (!users) throw new NotFoundException('no users found');
    return {
      success: true,
      message: `${role} fetched successful`,
      data: users,
    };
  }
}
