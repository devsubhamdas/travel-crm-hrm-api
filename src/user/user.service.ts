import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, user } from 'src/generated/prisma/client';
import { CreateUserDto, UserResponseDto } from 'src/user/dto/user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly _prisma: PrismaService) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const payload = {
      name: dto.name,
      email: dto.email,
      contact_no: dto.contact_no,
      passwordHash: dto.password,
      role: dto.role,
    };
    try {
      const user = await this._prisma.user.create({ data: payload });
      return {
        id: user.id.toString(),
        name: user.name as string,
        email: user.email,
        contact_no: user.contact_no as string,
        role: user.role as string,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const constraint = (error.meta as any)?.driverAdapterError?.cause?.constraint?.index;

        if (constraint === 'email') {
          throw new ConflictException('Email already exists');
        }

        if (constraint === 'contact_no') {
          throw new ConflictException('Mobile number already exists');
        }

        throw new ConflictException('Duplicate field value');
      }

      throw error;
    }
  }

  async findByEmail(email: string): Promise<user | null> {
    return await this._prisma.user.findUnique({
      where: { email },
    });
  }
  async findById(id: number): Promise<user | null> {
    return await this._prisma.user.findUnique({
      where: { id },
    });
  }

  async getUsers(match?: {}) {
    return await this._prisma.user.findMany({
      where: match,
      select: {
        id: true,
        name: true,
        email: true,
        contact_no: true,
        is_active: true,
        createdAt: true,
      },
    });
  }

  async storeRefreshToken(id: string, token: string) {
    await this._prisma.user.update({
      where: { id: BigInt(id) },
      data: { refreshToken: token },
    });
  }

  async clearRefreshToken(id: string) {
    await this._prisma.user.update({
      where: { id: BigInt(id) },
      data: { refreshToken: null },
    });
  }
}
