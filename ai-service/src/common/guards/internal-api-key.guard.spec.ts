import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { InternalApiKeyGuard } from './internal-api-key.guard.js';

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('InternalApiKeyGuard', () => {
  let guard: InternalApiKeyGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalApiKeyGuard,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'secret-key' },
        },
      ],
    }).compile();
    guard = module.get<InternalApiKeyGuard>(InternalApiKeyGuard);
  });

  it('returns true when correct api key provided', () => {
    const ctx = makeContext({ 'x-internal-api-key': 'secret-key' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when key is missing', () => {
    const ctx = makeContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when key is wrong', () => {
    const ctx = makeContext({ 'x-internal-api-key': 'wrong-key' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
