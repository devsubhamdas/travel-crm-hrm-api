import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED'])
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @IsIn(['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'])
  payment_status?: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
}
