import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * Creates and configures the NestJS application.
 *
 * Extracted into a factory so both entry points share identical config:
 *   - main.ts    → local dev server
 *   - lambda.ts  → AWS Lambda handler
 *
 * Register global middleware, pipes, filters, interceptors here.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  return app;
}
