import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { DonorsModule } from '../donors/donors.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DonorsModule, NotificationsModule],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
