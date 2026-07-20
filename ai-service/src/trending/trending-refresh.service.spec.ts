import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { TrendingRefreshService } from './trending-refresh.service.js';
import { TrendingRepository } from './trending.repository.js';
import { TrendingService } from './trending.service.js';

const mockTrendingService = { refresh: jest.fn() };
const mockRepository = {
  getRegionsInUse: jest.fn(),
  deleteStaleTopics: jest.fn().mockResolvedValue(0),
};
const mockSchedulerRegistry = { addCronJob: jest.fn() };

/** Flags on by default for YT+IG, off for X — mirrors the intended prod default. */
const configValues: Record<string, string> = {
  DISABLE_TRENDING_CRON: 'true', // keep onModuleInit inert in tests
  TRENDING_YOUTUBE_ENABLED: 'true',
  TRENDING_INSTAGRAM_ENABLED: 'true',
  TRENDING_X_ENABLED: 'false',
  TRENDING_DEFAULT_REGION: 'US',
};

const mockConfig = {
  get: jest.fn(
    (key: string, fallback?: unknown) => configValues[key] ?? fallback,
  ),
};

describe('TrendingRefreshService', () => {
  let service: TrendingRefreshService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendingRefreshService,
        { provide: TrendingService, useValue: mockTrendingService },
        { provide: TrendingRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();
    service = module.get(TrendingRefreshService);
    jest.clearAllMocks();
    mockRepository.deleteStaleTopics.mockResolvedValue(0);
  });

  it('refreshes enabled platforms across regions in use plus the default', async () => {
    // Arrange
    mockRepository.getRegionsInUse.mockResolvedValue(['GB', 'US']);
    mockTrendingService.refresh.mockResolvedValue({
      platform: 'YOUTUBE',
      region: 'US',
      fetched: 5,
      written: 5,
    });

    // Act
    const { results, failures } = await service.refreshAll();

    // Assert — YT runs per region (GB, US); IG runs ONCE with GLOBAL; X disabled.
    expect(failures).toHaveLength(0);
    expect(mockTrendingService.refresh).toHaveBeenCalledWith('YOUTUBE', 'GB');
    expect(mockTrendingService.refresh).toHaveBeenCalledWith('YOUTUBE', 'US');
    expect(mockTrendingService.refresh).toHaveBeenCalledWith(
      'INSTAGRAM',
      'GLOBAL',
    );
    expect(mockTrendingService.refresh).not.toHaveBeenCalledWith(
      'TWITTER',
      expect.anything(),
    );
    expect(results).toHaveLength(3);
  });

  it('a failing platform is recorded and does not abort the others', async () => {
    // Arrange
    mockRepository.getRegionsInUse.mockResolvedValue(['US']);
    mockTrendingService.refresh.mockImplementation(
      (platform: string, region: string) => {
        if (platform === 'YOUTUBE') {
          return Promise.reject(new Error('quota exceeded'));
        }
        return Promise.resolve({ platform, region, fetched: 1, written: 1 });
      },
    );

    // Act
    const { results, failures } = await service.refreshAll();

    // Assert
    expect(failures).toEqual([
      { platform: 'YOUTUBE', region: 'US', error: 'quota exceeded' },
    ]);
    expect(results).toHaveLength(1); // Instagram still ran
  });

  it('prunes stale topics AFTER the refresh and reports the count', async () => {
    // Arrange
    mockRepository.getRegionsInUse.mockResolvedValue(['US']);
    mockTrendingService.refresh.mockResolvedValue({
      platform: 'YOUTUBE',
      region: 'US',
      fetched: 1,
      written: 1,
    });
    mockRepository.deleteStaleTopics.mockResolvedValue(7);

    // Act
    const { pruned } = await service.refreshAll();

    // Assert
    expect(mockRepository.deleteStaleTopics).toHaveBeenCalledWith(30);
    expect(pruned).toBe(7);
  });

  it('a failing prune never fails the refresh', async () => {
    // Arrange
    mockRepository.getRegionsInUse.mockResolvedValue(['US']);
    mockTrendingService.refresh.mockResolvedValue({
      platform: 'YOUTUBE',
      region: 'US',
      fetched: 1,
      written: 1,
    });
    mockRepository.deleteStaleTopics.mockRejectedValue(new Error('db down'));

    // Act
    const { results, pruned } = await service.refreshAll();

    // Assert
    expect(results).toHaveLength(2); // YT + IG still succeeded
    expect(pruned).toBe(0);
  });

  it('skips cron registration when DISABLE_TRENDING_CRON=true', () => {
    // Act
    service.onModuleInit();

    // Assert
    expect(mockSchedulerRegistry.addCronJob).not.toHaveBeenCalled();
  });
});
