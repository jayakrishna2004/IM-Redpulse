import { Controller, Get, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

/**
 * The Oracle Controller provides a "Source of Truth" for dynamic tunnels.
 * This endpoint is prefix-exempt and allows the mobile app to self-heal
 * by discovering the latest active tunnel URLs.
 */
@Controller('oracle')
export class OracleController {
  @Get()
  getOracle() {
    const filePath = join(process.cwd(), 'ACTIVE_TUNNEL.txt');
    
    if (!existsSync(filePath)) {
      return { 
        status: 'pending', 
        message: 'Tunnels are currently spawning. Please wait 10 seconds.' 
      };
    }

    try {
      const content = require('fs').readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const cfMatch = lines.find(l => l.startsWith('CF:'))?.replace('CF: ', '').trim();
      const ltMatch = lines.find(l => l.startsWith('LT:'))?.replace('LT: ', '').trim();
      
      return {
        status: 'ready',
        tunnels: {
          cloudflare: cfMatch || null,
          localtunnel: ltMatch || null
        },
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return { status: 'error', message: 'Oracle is sleeping' };
    }
  }
}
