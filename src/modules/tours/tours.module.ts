import { Module } from '@nestjs/common';
import { ToursService } from './tours.service';
import { ToursController } from './tours.controller';

@Module({
  providers: [ToursService],
  controllers: [ToursController],
})
export class ToursModule {}
