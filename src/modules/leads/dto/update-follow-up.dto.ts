import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateFollowUpDto {
  @IsIn(['pending', 'follow_up_needed', 'scheduled', 'completed', 'not_required'])
  followUpStatus:
    | 'pending'
    | 'follow_up_needed'
    | 'scheduled'
    | 'completed'
    | 'not_required';

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}