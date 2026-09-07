import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadsSyncService } from './leads-sync.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LeadCleanupService } from './leadCleanUp.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsSyncService,LeadCleanupService],
  exports: [LeadsSyncService, LeadsService],
})
export class LeadsModule {}