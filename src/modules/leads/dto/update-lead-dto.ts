import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsDateString,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contact_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  destination?: string;

  @IsOptional()
  @IsDateString()
  travel_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  travellers_count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  budget?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  source?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigned_agent_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  assigned_agent_name?: string;

  @IsOptional()
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
  status?:
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
  follow_up_status?: 'pending' | 'follow_up_needed' | 'scheduled' | 'completed' | 'not_required';

  @IsOptional()
  @IsDateString()
  follow_up_date?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn([
    'trip_lead',
    'enquiry',
    'itinerary',
    'contact',
    'manual',
    'whatsapp',
    'call',
    'email',
    'media_ad',
    'social_ad',
    'twak_to',
    'datasheet',
    'walk_in',
    'referral',
  ])
  source_type?:
    | 'trip_lead'
    | 'enquiry'
    | 'itinerary'
    | 'contact'
    | 'manual'
    | 'whatsapp'
    | 'call'
    | 'email'
    | 'media_ad'
    | 'social_ad'
    | 'twak_to'
    | 'datasheet'
    | 'walk_in'
    | 'referral';

  @IsOptional()
  @IsIn(['fixed', 'customized', 'others'])
  departure_type?: 'fixed' | 'customized' | 'others';
}
