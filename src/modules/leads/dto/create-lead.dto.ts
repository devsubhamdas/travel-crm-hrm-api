import {
  IsInt,
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  IsIn,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeadDto {
  @IsString()
  @Matches(/^[a-zA-Z\s.]+$/, {
    message: 'enter valid name, must contain only letters, spaces, and dots',
  })
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+91[-]?)?[6-9]\d{9}$/, {
    message: 'enter valid mobile number (e.g. 9876543210, +919876543210, +91-9876543210)',
  })
  contact_no?: string;

  @IsOptional()
  @IsString()
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
  budget?: string;

  @IsOptional()
  @IsString()
  source?: string; // default Manual

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigned_agent_id?: number;

  @IsOptional()
  @IsString()
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
  @IsDateString()
  follow_up_date?: string;

  @IsOptional()
  @IsIn(['fixed', 'customized', 'others'])
  departure_type?: 'fixed' | 'customized' | 'others';
}
