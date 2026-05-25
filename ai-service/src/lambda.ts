import serverlessExpress from '@codegenie/serverless-express';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Callback,
  Context,
} from 'aws-lambda';
import { Express } from 'express';
import { createApp } from './app.bootstrap.js';

type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<APIGatewayProxyResult>,
) => Promise<APIGatewayProxyResult>;

/**
 * Cached serverless-express handler.
 *
 * Lambda reuses the execution environment across warm invocations.
 * Caching here means NestJS only bootstraps once (cold start only).
 */
let cachedHandler: LambdaHandler;

/**
 * Lazily initialise the NestJS app and wrap with serverless-express.
 *
 * serverless-express translates API Gateway events into standard
 * Express req/res so NestJS never knows it is running inside Lambda.
 */
async function bootstrapLambda(): Promise<LambdaHandler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const app = await createApp();
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  cachedHandler = serverlessExpress({
    app: expressApp,
  }) as unknown as LambdaHandler;

  return cachedHandler;
}

/**
 * Lambda entry point.
 *
 * API Gateway invokes this for every HTTP request.
 * Handler is initialised once and reused on warm invocations.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<APIGatewayProxyResult>,
): Promise<APIGatewayProxyResult> => {
  const handlerFn = await bootstrapLambda();
  return handlerFn(event, context, callback);
};
