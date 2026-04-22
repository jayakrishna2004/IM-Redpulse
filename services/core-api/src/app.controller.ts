import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('info') // Descriptive endpoint
  getInfo() {
    return { 
      status: 'online', 
      message: 'RedPulse API is operational',
      docs: '/api/docs',
      health: '/api/health'
    };
  }

  @Get('health')
  getHealth() {
    return { status: 'online', timestamp: new Date().toISOString() };
  }
}
