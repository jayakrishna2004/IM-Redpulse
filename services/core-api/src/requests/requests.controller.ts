import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request, Query, Logger } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateRequestDto {
  @IsString({ message: 'Hospital ID must be a valid string.' })
  hospitalId: string;

  @IsString()
  bloodGroup: string;

  @IsString()
  urgency: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional() @IsNumber()
  unitsNeeded?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class RespondDto {
  @IsIn(['ACCEPTED', 'REJECTED']) action: 'ACCEPTED' | 'REJECTED';
}

@ApiTags('Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  private readonly logger = new Logger(RequestsController.name);
  
  constructor(private requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create emergency blood request' })
  create(@Body() dto: CreateRequestDto) {
    this.logger.log(`🚨 [INCOMING] Hospital ID: ${dto.hospitalId} | Group: ${dto.bloodGroup}`);
    return this.requestsService.createRequest(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all requests' })
  findAll(@Query('status') status?: string, @Query('hospitalId') hospitalId?: string) {
    return this.requestsService.getAll({ status, hospitalId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request details' })
  findOne(@Param('id') id: string) {
    return this.requestsService.getById(id);
  }

  @Get(':id/responses')
  @ApiOperation({ summary: 'Get ranked donor responses' })
  getResponses(@Param('id') id: string) {
    return this.requestsService.getDonorResponsesForRequest(id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Donor response' })
  respond(@Param('id') id: string, @Body() dto: RespondDto, @Request() req) {
    return this.requestsService.respondToRequest(id, req.user.id, dto.action);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel request' })
  cancel(@Param('id') id: string) {
    return this.requestsService.cancelRequest(id);
  }
}
