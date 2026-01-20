import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성은 자동으로 제거 (보안상 좋음)
      forbidNonWhitelisted: true, // DTO에 없는 속성이 들어오면 아예 에러를 뱉음 (선택 사항)
      transform: true, // 클라이언트가 보낸 데이터를 DTO 타입으로 자동 변환
    }),
  );

  await app.listen(4000);
}

void bootstrap();
