import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, UserResponseDto } from '../user/dto/user.dto';
import { LoginDto } from './dto/auth.dto';
import { ApiResponse } from 'src/common/types/index.type';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { Public } from 'src/common/decorators/public/public.decorator';
import { Roles } from 'src/common/decorators/roles/roles.decorator';
import { users_role } from 'src/generated/prisma/client';
import { RolesGuard } from 'src/common/guards/roles/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_role.admin)
  @Post('register-user')
  async registerUser(@Body() dto: CreateUserDto): Promise<ApiResponse<UserResponseDto>> {
    const data = await this._authService.registerUser(dto);
    return {
      success: true,
      message: 'user registered success',
      data,
    };
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async loginUser(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const data = await this._authService.login(dto);

    res.cookie('access_token', data.accessToken, {
      httpOnly: true,
      secure: false, // true in production (HTTPS)
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60, // 1 hour
    });

    res.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return {
      success: true,
      message: 'login successful',
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    this._authService.logout((req.user as any).id);

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
