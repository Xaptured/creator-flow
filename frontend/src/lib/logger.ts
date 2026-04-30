import pino from 'pino';

/**
 * Server-side logger using pino.
 * Use this in API routes, mediaApi, and routeErrorHandler.
 * Never import this in client components — it is server-only.
 *
 * pino-pretty relies on worker threads which Next.js/webpack cannot bundle.
 * We use plain JSON output in all environments — Next.js dev server prints
 * it to the terminal and it works correctly in production too.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

export default logger;
