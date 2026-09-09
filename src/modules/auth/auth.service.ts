import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from '../user/dto/user.dto';
import bcrypt from 'bcrypt';
import { LoginDto } from './dto/auth.dto';
import { user, users_role } from 'src/generated/prisma/client';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UserService,
    private readonly _jwtService: JwtService,
  ) {}

  async registerUser(dto: CreateUserDto) {
    const saltRound = 10;
    const pHash = await bcrypt.hash(dto.password, saltRound);
    return this._userService.createUser({ ...dto, password: pHash });
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // store refresh token into db
    await this._userService.storeRefreshToken(user.id.toString(), refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(id: string) {
    await this._userService.clearRefreshToken(id);
  }

  async validateUser(dto: LoginDto) {
    const user = await this._userService.findByEmail(dto.email);
    // only 'admin' | 'operator' | 'sales' have access
    const allowedRoles: Array<users_role> = [
      users_role.admin,
      users_role.operator,
      users_role.sales,
    ];
    if (user?.role != null && !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(`role: ${user.role} doesn't have permission to access`);
    }

    if (!user) {
      throw new NotFoundException('Invalid email: user not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash as string);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return user;
  }

  private generateAccessToken(user: user) {
    const options: SignOptions = {
      expiresIn: process.env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
    };

    const payload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    return this._jwtService.sign(payload, options);
  }

  private generateRefreshToken(user: user) {
    const options: SignOptions = {
      expiresIn: process.env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'],
    };
    const payload = {
      sub: user.id.toString(),
    };

    return this._jwtService.sign(payload, options);
  }
}
