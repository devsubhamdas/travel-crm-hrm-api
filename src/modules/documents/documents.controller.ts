import { Body, Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';

import { RejectDocumentDto } from './dto/reject-document.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles/roles.guard';
import { users_role } from 'generated/prisma/enums';
import { Roles } from 'src/common/decorators/roles/roles.decorator';
 
@Controller('crm/documents')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(users_role.admin, users_role.operator, users_role.manager)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}
 
  @Get('travellers/:id/documents')
  getTravellerDocuments(
    @Param('id', ParseIntPipe) travellerId: number,
    @Req() req: any,
  ) {
    return this.documentsService.getTravellerDocuments(travellerId, req.user);
  }
 
   @Get('pending')
getPendingDocuments(@Req() req: any) {
  return this.documentsService.getPendingDocuments(req.user);
}

   @Get('verify')
getVerifiedDocuments(@Req() req: any) {
  return this.documentsService.getVerifiedDocuments(req.user);
}

   @Get('rejected')
getRejectedDocuments(@Req() req: any) {
  return this.documentsService.getRejectedDocuments(req.user);
}

@Patch(':id/verify')
  verifyDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.documentsService.verifyDocument(id, req.user);
  }
 
  @Patch(':id/reject')
  rejectDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDocumentDto,
    @Req() req: any,
  ) {
    return this.documentsService.rejectDocument(id, dto, req.user);
  }
 
}