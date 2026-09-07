import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // BigInt serialization: Fixes Prisma BIGINT fields like id
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const app = await NestFactory.create(AppModule);
  // cors config
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://olivedrab-turkey-601293.hostingersite.com',
      'https://www.olivedrab-turkey-601293.hostingersite.com',
    ], // your Angular dev server
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // needed if using cookies
  });

  // endpoint prefix: /api/*
  app.setGlobalPrefix('api');
  // dto validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // cookie setup
  app.use(cookieParser());
  // enable lifecycle shutdown hooks
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
