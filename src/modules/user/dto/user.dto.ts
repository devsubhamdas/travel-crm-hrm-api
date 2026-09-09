import { IsString, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { users_role as Role } from 'src/generated/prisma/enums';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  contact_no: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  contact_no: string;
  role: string;
}
