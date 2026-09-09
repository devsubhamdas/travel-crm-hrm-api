import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { LeadsService } from './modules/leads/leads.service';
import { LeadsController } from './modules/leads/leads.controller';
import { LeadsModule } from './modules/leads/leads.module';
import { EmployeesController } from './modules/employees/employees.controller';
import { EmployeesModule } from './modules/employees/employees.module';
import e from 'express';
import { EmployeesService } from './modules/employees/employees.service';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ToursModule } from './modules/tours/tours.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LeadCleanupService } from './modules/leads/leadCleanUp.service';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    PrismaModule,
    LeadsModule,
    EmployeesModule,
    BookingsModule,
    DocumentsModule,
    ToursModule,
    ScheduleModule.forRoot(),
    DashboardModule,
  ],
  controllers: [AppController, LeadsController, EmployeesController],
  providers: [AppService, LeadsService, EmployeesService, LeadCleanupService],
})
export class AppModule {}
