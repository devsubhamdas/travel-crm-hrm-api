import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeadCleanupService {
  private readonly logger = new Logger(LeadCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMissedFollowUps() {
    this.logger.log('Running Cleanup: Checking for missed follow-ups...');

    const now = new Date();

    // We use a transaction to ensure both tables stay in sync
    await this.prisma.$transaction(async (tx) => {
      
      // 1. Identify follow-ups that passed their date without being completed
      const missedFollowUps = await tx.lead_follow_ups.findMany({
        where: {
          status: 'pending',
          follow_up_date: { lt: now }, // 'lt' means Less Than (in the past)
        },
      });

      if (missedFollowUps.length === 0) return;

      // 2. Mark follow-ups as 'missed' in the history table
      await tx.lead_follow_ups.updateMany({
        where: {
          id: { in: missedFollowUps.map(f => f.id) },
        },
        data: { status: 'missed' },
      });

      // 3. Update the main Lead table so the Agent sees "Follow-up Needed"
      const leadIds = [...new Set(missedFollowUps.map(f => f.lead_id))];
      
      await tx.leads.updateMany({
        where: {
          id: { in: leadIds.map(id => BigInt(id)) },
        },
        data: {
          follow_up_status: 'follow_up_needed', // This triggers a red flag in the UI
        },
      });

      this.logger.log(`Cleanup complete. ${missedFollowUps.length} follow-ups marked as missed.`);
    });
  }
}