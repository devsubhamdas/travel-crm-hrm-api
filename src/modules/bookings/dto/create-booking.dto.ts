import {
  IsInt,
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
  IsPositive,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FollowUpStatus {
  PENDING = 'pending',
  FOLLOW_UP_NEEDED = 'follow_up_needed',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  NOT_REQUIRED = 'not_required',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  tour_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  user_id?: number;

  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Z\s.]+$/, {
    message: 'enter valid name, must contain only letters, spaces, and dots',
  })
  customer_name!: string;

  @IsEmail()
  @MaxLength(120)
  customer_email!: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^(\+91[-]?)?[6-9]\d{9}$/, {
    message: 'enter valid mobile number (e.g. 9876543210, +919876543210, +91-9876543210)',
  })
  customer_phone!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests!: number;

  @IsDateString()
  travel_date!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  departure_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  total_amount_paise!: number;

  @IsOptional()
  @IsString()
  ops_notes?: string;

  @IsOptional()
  @IsEnum(FollowUpStatus)
  follow_up_status?: FollowUpStatus;

  @IsOptional()
  @IsDateString()
  follow_up_date?: string;

  @IsOptional()
  @IsString()
  follow_up_note?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}