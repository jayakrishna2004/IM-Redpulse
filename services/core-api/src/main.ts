import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api', { exclude: ['/', 'oracle'] });
  app.enableCors({
    origin: '*', // Allow all for local dev to prevent mobile connectivity issues
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,bypass-tunnel-reminder',
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('RedPulse API')
    .setDescription('Emergency Blood Response System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Definitive Root Handler (Prefix-Exempt)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (req: any, res: any) => {
    res.status(200).json({
      status: 'online',
      message: 'Welcome to RedPulse Core API',
      documentation: '/api/docs',
      health: '/api/health'
    });
  });

  const port = process.env.CORE_API_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🩸 RedPulse Core API running on: http://localhost:${port}`);
  console.log(`📡 Local Network Access: http://172.29.135.15:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
