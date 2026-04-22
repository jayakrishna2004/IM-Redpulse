import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class LocationUpdateDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Post(':requestId/location')
  @ApiOperation({ summary: 'Donor pushes live location during active delivery' })
  updateLocation(
    @Param('requestId') requestId: string,
    @Body() dto: LocationUpdateDto,
    @Request() req,
  ) {
    return this.trackingService.updateDonorLocation(requestId, req.user.id, dto.lat, dto.lng);
  }

  @Get(':requestId')
  @ApiOperation({ summary: 'Get current tracking session for a request' })
  getSession(@Param('requestId') requestId: string) {
    return this.trackingService.getTrackingSession(requestId);
  }

  @Post(':requestId/complete')
  @ApiOperation({ summary: 'Mark delivery as complete' })
  complete(@Param('requestId') requestId: string) {
    return this.trackingService.completeTracking(requestId);
  }
}
