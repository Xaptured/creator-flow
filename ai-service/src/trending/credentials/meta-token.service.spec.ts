import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { TrendingRepository } from '../trending.repository.js';
import { MetaTokenService } from './meta-token.service.js';

const mockRepository = {
  getCredential: jest.fn(),
  setCredential: jest.fn(),
};

const mockSchedulerRegistry = { addCronJob: jest.fn() };

const configValues: Record<string, string> = {
  DISABLE_TRENDING_CRON: 'true', // keep onModuleInit inert in tests
  META_APP_ID: 'app-id',
  META_APP_SECRET: 'app-secret',
  IG_APP_ACCESS_TOKEN: 'env-bootstrap-token',
};

const mockConfig = {
  get: jest.fn(
    (key: string, fallback?: unknown) => configValues[key] ?? fallback,
  ),
  getOrThrow: jest.fn((key: string) => {
    if (!(key in configValues)) throw new Error(`Missing config ${key}`);
    return configValues[key];
  }),
};

describe('MetaTokenService', () => {
  let service: MetaTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaTokenService,
        { provide: TrendingRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();
    service = module.get(MetaTokenService);
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('getIgAccessToken', () => {
    it('prefers the rotated DB credential over the env bootstrap value', async () => {
      // Arrange
      mockRepository.getCredential.mockResolvedValue('rotated-db-token');

      // Act
      const token = await service.getIgAccessToken();

      // Assert
      expect(token).toBe('rotated-db-token');
    });

    it('falls back to the env value when no DB row exists', async () => {
      // Arrange
      mockRepository.getCredential.mockResolvedValue(null);

      // Act
      const token = await service.getIgAccessToken();

      // Assert
      expect(token).toBe('env-bootstrap-token');
    });
  });

  describe('refreshIgToken', () => {
    it('exchanges the current token and persists the fresh one', async () => {
      // Arrange
      mockRepository.getCredential.mockResolvedValue('old-token');
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'fresh-token',
            expires_in: 5_184_000,
          }),
      } as unknown as Response);

      // Act
      const result = await service.refreshIgToken();

      // Assert
      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toContain('grant_type=fb_exchange_token');
      expect(calledUrl).toContain('fb_exchange_token=old-token');
      expect(mockRepository.setCredential).toHaveBeenCalledWith(
        'IG_APP_ACCESS_TOKEN',
        'fresh-token',
      );
      expect(result).toEqual({ refreshed: true, expiresInSeconds: 5_184_000 });
    });

    it('throws (and does NOT overwrite the stored token) on a failed exchange', async () => {
      // Arrange
      mockRepository.getCredential.mockResolvedValue('old-token');
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as unknown as Response);

      // Act + Assert
      await expect(service.refreshIgToken()).rejects.toThrow('400');
      expect(mockRepository.setCredential).not.toHaveBeenCalled();
    });

    it('throws when the exchange response has no access_token', async () => {
      // Arrange
      mockRepository.getCredential.mockResolvedValue('old-token');
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as unknown as Response);

      // Act + Assert
      await expect(service.refreshIgToken()).rejects.toThrow('no access_token');
      expect(mockRepository.setCredential).not.toHaveBeenCalled();
    });
  });

  it('skips cron registration when DISABLE_TRENDING_CRON=true', () => {
    // Act
    service.onModuleInit();

    // Assert
    expect(mockSchedulerRegistry.addCronJob).not.toHaveBeenCalled();
  });
});
