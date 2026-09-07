import { IsOptional, IsString, IsInt, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFollowupsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  follow_up_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigned_agent_id?: number;

  @IsOptional()
  @IsString()
  sort?: string = 'created_at';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}
