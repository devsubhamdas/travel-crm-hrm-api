import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  rejection_reason!: string;
}
