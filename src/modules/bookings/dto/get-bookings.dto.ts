import { IsOptional, IsString } from 'class-validator';
 
export class GetBookingsDto {
  @IsOptional()
  @IsString()
  page?: string;
 
  @IsOptional()
  @IsString()
  limit?: string;
 
  @IsOptional()
  @IsString()
  search?: string;
 
  @IsOptional()
  @IsString()
  status?: string;
 
  @IsOptional()
  @IsString()
  payment_status?: string;
 
  @IsOptional()
  @IsString()
  date_from?: string;
 
  @IsOptional()
  @IsString()
  date_to?: string;
}