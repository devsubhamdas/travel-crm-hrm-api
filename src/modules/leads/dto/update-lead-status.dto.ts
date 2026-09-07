import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateLeadStatusDto {
  @IsIn([
    'new',
    'contacted',
    'qualified',
    'quoted',
    'negotiation',
    'booking_in_progress',
    'converted',
    'lost',
    'closed',
  ])
  status:
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'quoted'
    | 'negotiation'
    | 'booking_in_progress'
    | 'converted'
    | 'lost'
    | 'closed';

  @IsOptional()
  @IsIn(['pending', 'follow_up_needed', 'scheduled', 'completed', 'not_required'])
  followUpStatus?: 'pending' | 'follow_up_needed' | 'scheduled' | 'completed' | 'not_required';

  @IsOptional()
  @IsDateString()
  followUpDate?: string | null;

  @IsOptional()
  @IsString()
  note?: string;
}
