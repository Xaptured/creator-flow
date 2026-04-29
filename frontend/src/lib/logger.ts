import pino from 'pino';

/**
 * Server-side logger using pino.
 * Use this in API routes, mediaApi, and routeErrorHandler.
 * Never import this in client components — it is server-only.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;
