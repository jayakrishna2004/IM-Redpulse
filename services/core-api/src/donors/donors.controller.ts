import { Controller, Get, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { DonorsService } from './donors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNumber, IsIn, IsOptional } from 'class-validator';

export class UpdateLocationDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

export class UpdateAvailabilityDto {
  @IsIn(['ACTIVE', 'INACTIVE']) status: 'ACTIVE' | 'INACTIVE';
}

@ApiTags('Donors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('donors')
export class DonorsController {
  constructor(private donorsService: DonorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all donors with scores' })
  findAll() {
    return this.donorsService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current donor profile' })
  getMe(@Request() req) {
    return this.donorsService.findByUserId(req.user.id);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get donation history' })
  getHistory(@Request() req) {
    return this.donorsService.getDonationHistory(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get donor by ID' })
  findOne(@Param('id') id: string) {
    return this.donorsService.findById(id);
  }

  @Patch('location')
  @ApiOperation({ summary: 'Update donor GPS location' })
  updateLocation(@Request() req, @Body() dto: UpdateLocationDto) {
    return this.donorsService.updateLocation(req.user.id, dto.lat, dto.lng);
  }

  @Patch('availability')
  @ApiOperation({ summary: 'Toggle donor availability (ACTIVE/INACTIVE)' })
  updateAvailability(@Request() req, @Body() dto: UpdateAvailabilityDto) {
    return this.donorsService.updateAvailability(req.user.id, dto.status);
  }
}
