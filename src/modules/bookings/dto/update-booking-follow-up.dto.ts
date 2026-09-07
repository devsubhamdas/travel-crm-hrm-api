import { IsIn, IsOptional, IsString } from 'class-validator';
 
export class UpdateBookingFollowUpDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'follow_up_needed', 'scheduled', 'completed', 'not_required'])
  follow_up_status?: 'pending' | 'follow_up_needed' | 'scheduled' | 'completed' | 'not_required';
 
  @IsOptional()
  @IsString()
  follow_up_date?: string;
 
  @IsOptional()
  @IsString()
  follow_up_note?: string;
}