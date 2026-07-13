import { Test, TestingModule } from '@nestjs/testing';

import { EmbeddingProviderService } from '../embeddings/provider/embedding-provider.service.js';
import { InstagramTrendingClient } from './clients/instagram-trending.client.js';
import { XTrendingClient } from './clients/x-trending.client.js';
import { YoutubeTrendingClient } from './clients/youtube-trending.client.js';
import { RawTrend } from './model/raw-trend.model.js';
import { TopicNormalizerService } from './normalizer/topic-normalizer.service.js';
import { TrendingRepository } from './trending.repository.js';
import { TrendingService } from './trending.service.js';

const mockYoutube = { fetch: jest.fn() };
const mockX = { fetch: jest.fn() };
const mockInstagram = { fetch: jest.fn() };
const mockNormalizer = { normalize: jest.fn() };
const mockProvider = {
  modelName: 'text-embedding-3-small',
  embedBatch: jest.fn(),
};
const mockRepository = { upsertTopics: jest.fn() };

const VECTOR = Array(1536).fill(0.1);

function raw(rawText: string, overrides: Partial<RawTrend> = {}): RawTrend {
  return {
    platform: 'YOUTUBE',
    rawText,
    sourceRef: `ref-${rawText}`,
    region: 'US',
    ...overrides,
  };
}

describe('TrendingService', () => {
  let service: TrendingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendingService,
        { provide: YoutubeTrendingClient, useValue: mockYoutube },
        { provide: XTrendingClient, useValue: mockX },
        { provide: InstagramTrendingClient, useValue: mockInstagram },
        { provide: TopicNormalizerService, useValue: mockNormalizer },
        { provide: EmbeddingProviderService, useValue: mockProvider },
        { provide: TrendingRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get(TrendingService);
    jest.clearAllMocks();
  });

  it('runs fetch → normalize → embed → upsert end-to-end', async () => {
    // Arrange
    const rawTrend = raw('CRAZY console launch');
    mockYoutube.fetch.mockResolvedValue([rawTrend]);
    mockNormalizer.normalize.mockResolvedValue([
      { raw: rawTrend, normalized: { topic: 'Console launch', niche: 'Gaming' } },
    ]);
    mockProvider.embedBatch.mockResolvedValue([VECTOR]);
    mockRepository.upsertTopics.mockResolvedValue(1);

    // Act
    const result = await service.refresh('YOUTUBE', 'US');

    // Assert
    expect(result).toEqual({
      platform: 'YOUTUBE',
      region: 'US',
      fetched: 1,
      written: 1,
    });
    expect(mockRepository.upsertTopics).toHaveBeenCalledWith([
      {
        platform: 'YOUTUBE',
        topic: 'Console launch',
        sourceRef: 'ref-CRAZY console launch',
        niche: 'Gaming',
        embedding: VECTOR,
        model: 'text-embedding-3-small',
        region: 'US',
      },
    ]);
  });

  it('skips embedding and upsert when the client returns nothing', async () => {
    // Arrange
    mockX.fetch.mockResolvedValue([]);

    // Act
    const result = await service.refresh('TWITTER', 'US');

    // Assert
    expect(result.written).toBe(0);
    expect(mockNormalizer.normalize).not.toHaveBeenCalled();
    expect(mockProvider.embedBatch).not.toHaveBeenCalled();
  });

  it("filters out 'Other' niche topics before embedding", async () => {
    // Arrange
    const keep = raw('Good topic');
    const drop = raw('Unclassifiable');
    mockYoutube.fetch.mockResolvedValue([keep, drop]);
    mockNormalizer.normalize.mockResolvedValue([
      { raw: keep, normalized: { topic: 'Good topic', niche: 'Tech' } },
      { raw: drop, normalized: { topic: 'Unclassifiable', niche: 'Other' } },
    ]);
    mockProvider.embedBatch.mockResolvedValue([VECTOR]);
    mockRepository.upsertTopics.mockResolvedValue(1);

    // Act
    await service.refresh('YOUTUBE', 'US');

    // Assert
    expect(mockProvider.embedBatch).toHaveBeenCalledWith(['Good topic']);
  });

  it('dedupes topics that normalize to the same (platform, topic, region)', async () => {
    // Arrange
    const first = raw('Console launch REACTION');
    const second = raw('console launch reaction!!');
    mockYoutube.fetch.mockResolvedValue([first, second]);
    mockNormalizer.normalize.mockResolvedValue([
      { raw: first, normalized: { topic: 'Console launch', niche: 'Gaming' } },
      { raw: second, normalized: { topic: 'Console launch', niche: 'Gaming' } },
    ]);
    mockProvider.embedBatch.mockResolvedValue([VECTOR]);
    mockRepository.upsertTopics.mockResolvedValue(1);

    // Act
    await service.refresh('YOUTUBE', 'US');

    // Assert
    expect(mockProvider.embedBatch).toHaveBeenCalledWith(['Console launch']);
    expect(mockRepository.upsertTopics).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ topic: 'Console launch' })]),
    );
    expect((mockRepository.upsertTopics.mock.calls[0][0] as unknown[]).length).toBe(1);
  });
});
