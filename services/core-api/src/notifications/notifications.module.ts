import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from './mail.service';

import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [NotificationsService, NotificationsGateway, MailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
