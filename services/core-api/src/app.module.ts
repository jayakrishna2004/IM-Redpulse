import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DonorsModule } from './donors/donors.module';
import { RequestsModule } from './requests/requests.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { MatchingModule } from './matching/matching.module';
import { TrackingModule } from './tracking/tracking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DatabaseModule } from './database/database.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OracleController } from './oracle.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    DatabaseModule,
    AuthModule,
    DonorsModule,
    RequestsModule,
    HospitalsModule,
    MatchingModule,
    TrackingModule,
    NotificationsModule,
  ],
  controllers: [AppController, OracleController],
  providers: [AppService],
})
export class AppModule {}
