import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignLeadDto {
  @Type(() => Number)
  @IsInt()
  assignedAgentId: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assignedAgentName?: string;

  @IsOptional()
  @IsDateString()
  followupDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
