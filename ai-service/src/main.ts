import { createApp } from './app.bootstrap.js';

/**
 * Local development entry point.
 *
 * Boots the NestJS app and starts an HTTP server on the configured port.
 * This file is NOT used in Lambda — see lambda.ts for the production handler.
 */
async function bootstrap() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT) || 8500);
}

bootstrap();
