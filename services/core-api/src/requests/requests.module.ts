import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { MatchingModule } from '../matching/matching.module';
import { DonorsModule } from '../donors/donors.module';

@Module({
  imports: [MatchingModule, DonorsModule],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
