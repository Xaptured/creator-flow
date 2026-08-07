import serverlessExpress from '@codegenie/serverless-express';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Callback,
  Context,
} from 'aws-lambda';
import { Express } from 'express';
import { createApp } from './app.bootstrap.js';

/**
 * API Gateway **v2** (HTTP API) payload format — see CF-117, which provisions
 * an HTTP API with a $default proxy integration.
 *
 * serverless-express detects the event source at runtime and accepts both v1
 * and v2, so this is a compile-time correctness change. That leniency is also
 * the hazard: a v1 fixture would pass a local RIE test and prove nothing about
 * production, which is why the fixtures under `events/` are genuine v2
 * (version "2.0", requestContext.http.*, rawPath — no httpMethod).
 */
type LambdaHandler = (
  event: APIGatewayProxyEventV2,
  context: Context,
  callback: Callback<APIGatewayProxyResultV2>,
) => Promise<APIGatewayProxyResultV2>;

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
  event: APIGatewayProxyEventV2,
  context: Context,
  callback: Callback<APIGatewayProxyResultV2>,
): Promise<APIGatewayProxyResultV2> => {
  const handlerFn = await bootstrapLambda();
  return handlerFn(event, context, callback);
};
