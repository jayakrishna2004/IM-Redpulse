import { Controller, Get, Patch, Body, UseGuards, Request, Param, NotFoundException } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Hospitals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hospitals')
export class HospitalsController {
  constructor(private hospitalsService: HospitalsService) {}

  @Get()
  @ApiOperation({ summary: 'List all hospitals' })
  findAll() {
    return this.hospitalsService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide stats (active requests, donors, fulfillment rate)' })
  getStats() {
    return this.hospitalsService.getStats();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current hospital profile' })
  getMe(@Request() req) {
    return this.hospitalsService.findByUserId(req.user.id);
  }

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Full dashboard data for current hospital' })
  async getDashboard(@Request() req) {
    const hospital = await this.hospitalsService.findByUserId(req.user.id);
    return this.hospitalsService.getDashboardData(hospital.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hospital by ID' })
  findOne(@Param('id') id: string) {
    return this.hospitalsService.findById(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get hospital dashboard data' })
  getDashboardById(@Param('id') id: string) {
    return this.hospitalsService.getDashboardData(id);
  }

  @Patch('me/blood-stock')
  @ApiOperation({ summary: 'Update hospital blood inventory' })
  updateStock(@Request() req, @Body() dto: Record<string, number>) {
    return this.hospitalsService.findByUserId(req.user.id)
      .then(h => this.hospitalsService.updateBloodStock(h.id, dto));
  }

  @Patch(':id/blood-stock')
  @ApiOperation({ summary: 'Update specific hospital blood inventory via Command Center' })
  updateStockById(@Param('id') id: string, @Body() dto: Record<string, number>) {
    return this.hospitalsService.updateBloodStock(id, dto);
  }

  @Patch('me/verified-recipients')
  @ApiOperation({ summary: 'Update hospital test verified recipients for development' })
  async updateVerifiedRecipients(@Request() req, @Body() dto: { testEmail: string, testPhone: string }) {
    try {
      console.log(`[HOSPITAL] Updating verified recipients for User: ${req.user.id}`);
      const hospital = await this.hospitalsService.findByUserId(req.user.id);
      if (!hospital) {
        console.error(`[HOSPITAL] Profile not found for User: ${req.user.id}`);
        throw new NotFoundException('Hospital profile not found');
      }
      return await this.hospitalsService.updateVerifiedRecipients(hospital.id, dto.testEmail, dto.testPhone);
    } catch (err) {
      console.error(`[HOSPITAL] Update failed: ${err.message}`);
      throw err;
    }
  }
}
