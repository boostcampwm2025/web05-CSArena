import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import type { Application } from 'express';
import { RedisIoAdapter } from './common/redis-io-adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  (app.getHttpAdapter().getInstance() as Application).set('trust proxy', 1);
  app.use(compression());

  // Redis IO Adapter 설정 (Socket.IO 인스턴스 간 이벤트 브로드캐스트)
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisIoAdapter = new RedisIoAdapter(app, redisHost, redisPort);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Boostcamp Quiz API')
    .setDescription('Boostcamp 퀴즈 플랫폼 API 문서')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      'access-token',
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
      description: 'Refresh Token (HTTP Only Cookie)',
    })
    .addTag('auth', '인증 관련 API')
    .addTag('singleplay', '싱글플레이 관련 API')
    .addTag('quiz', '퀴즈 관련 API')
    .addTag('problem-bank', '문제 은행 관련 API')
    .addTag('feedback', '피드백 관련 API')
    .addTag('health', '헬스 체크 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(4000, '0.0.0.0');
}

void bootstrap();
