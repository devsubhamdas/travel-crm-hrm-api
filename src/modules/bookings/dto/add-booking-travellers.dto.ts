import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddBookingTravellerItemDto {
  @IsString()
  @MaxLength(120)
  full_name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  passport_number?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class AddBookingTravellersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddBookingTravellerItemDto)
  travellers!: AddBookingTravellerItemDto[];
}
