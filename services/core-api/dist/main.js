"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: true });
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, whitelist: true }));
    app.setGlobalPrefix('api', { exclude: ['/', 'oracle'] });
    app.enableCors({
        origin: '*',
        credentials: true,
        allowedHeaders: 'Content-Type,Authorization,bypass-tunnel-reminder',
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('RedPulse API')
        .setDescription('Emergency Blood Response System API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/', (req, res) => {
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
//# sourceMappingURL=main.js.map