import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @Matches(/^[a-zA-Z\s.]+$/, {
    message: 'enter valid name, must contain only letters, spaces, and dots',
  })
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+91[-]?)?[6-9]\d{9}$/, {
    message: 'enter valid mobile number (e.g. 9876543210, +919876543210, +91-9876543210)',
  })
  contact_no?: string;

  @IsIn(['admin', 'sales', 'operator', 'manager'])
  role: 'admin' | 'sales' | 'operator' | 'manager';

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsString()
  @MinLength(6)
  password: string;
}