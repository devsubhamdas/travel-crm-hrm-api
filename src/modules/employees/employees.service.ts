import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureAdmin(user: any) {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Only admin can perform this action');
    }
  }

  async getEmployees(
    currentUser: any,
    query: {
      page?: string;
      limit?: string;
      search?: string;
      role?: string;
      status?: string;
      sort?: string;
      order?: 'asc' | 'desc';
    },
  ) {
    this.ensureAdmin(currentUser);

    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.max(Number(query.limit || 10), 1);
    const skip = (page - 1) * limit;

    const where: any = {
      role: {
        in: ['admin', 'sales', 'operator', 'manager'],
      },
    };

    if (query.role) {
      where.role = query.role;
    }

    if (query.status === 'active') {
      where.is_active = true;
    } else if (query.status === 'inactive') {
      where.is_active = false;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { contact_no: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sort || 'id']: query.order || 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          contact_no: true,
          role: true,
          is_active: true,
          createdAt: true,
          _count: {
            select: {
              assigned_leads: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: Number(u.id),
        name: u.name,
        email: u.email,
        contact_no: u.contact_no,
        role: u.role,
        is_active: u.is_active,
        createdAt: u.createdAt,
        assigned_leads_count: u._count.assigned_leads,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStaffList(currentUser: any, role?: string) {
    this.ensureAdmin(currentUser);

    const where: any = {
      is_active: true,
      role: {
        in: ['admin', 'sales', 'operator', 'manager'],
      },
    };

    if (role) {
      where.role = role;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return users.map((u) => ({
      id: Number(u.id),
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }

  async getEmployeeById(id: number, currentUser: any) {
    this.ensureAdmin(currentUser);

    const employee = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: ['admin', 'sales', 'operator', 'manager'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        contact_no: true,
        role: true,
        is_active: true,
        createdAt: true,
        _count: {
          select: {
            assigned_leads: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const [convertedLeadsCount, pendingFollowUpsCount] = await Promise.all([
      this.prisma.leads.count({
        where: {
          assigned_agent_id: id,
          status: 'converted',
        },
      }),
      this.prisma.leads.count({
        where: {
          assigned_agent_id: id,
          follow_up_status: {
            in: ['pending', 'follow_up_needed', 'scheduled'],
          },
        },
      }),
    ]);

    return {
      id: Number(employee.id),
      name: employee.name,
      email: employee.email,
      contact_no: employee.contact_no,
      role: employee.role,
      is_active: employee.is_active,
      createdAt: employee.createdAt,
      assigned_leads_count: employee._count.assigned_leads,
      converted_leads_count: convertedLeadsCount,
      pending_follow_ups_count: pendingFollowUpsCount,
    };
  }

  async createEmployee(dto: CreateEmployeeDto, currentUser: any) {
    this.ensureAdmin(currentUser);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, ...(dto.contact_no ? [{ contact_no: dto.contact_no }] : [])],
      },
    });

    if (existing) {
      throw new BadRequestException('Employee with email/contact already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        contact_no: dto.contact_no || null,
        role: dto.role,
        is_active: dto.is_active ?? true,
        passwordHash,
        is_default_password_used: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        contact_no: true,
        role: true,
        is_active: true,
        createdAt: true,
      },
    });

    return {
      message: 'Employee created successfully',
      employee: {
        id: Number(created.id),
        name: created.name,
        email: created.email,
        contact_no: created.contact_no,
        role: created.role,
        is_active: created.is_active,
        createdAt: created.createdAt,
      },
    };
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto, currentUser: any) {
    this.ensureAdmin(currentUser);

    const employee = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: ['admin', 'sales', 'operator', 'manager'],
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.contact_no !== undefined ? { contact_no: dto.contact_no } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        contact_no: true,
        role: true,
        is_active: true,
        createdAt: true,
      },
    });

    return {
      message: 'Employee updated successfully',
      employee: {
        id: Number(updated.id),
        name: updated.name,
        email: updated.email,
        contact_no: updated.contact_no,
        role: updated.role,
        is_active: updated.is_active,
        createdAt: updated.createdAt,
      },
    };
  }
}
