import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { EmbeddingProviderService } from '../../embeddings/provider/embedding-provider.service.js';
import { TrendingRepository } from '../trending.repository.js';
import { GapService } from './gap.service.js';

const mockRepository = {
  getUserNicheRegion: jest.fn(),
  isActiveRegion: jest.fn(),
  findGaps: jest.fn(),
  findFallbackTopics: jest.fn(),
  hasAnyEmbedding: jest.fn(),
};

const mockProvider = { modelName: 'text-embedding-3-small' };

const mockConfig = {
  get: jest.fn((key: string, fallback?: unknown) => fallback),
};

const OWNER = 'kc-uuid-1';

describe('GapService', () => {
  let service: GapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GapService,
        { provide: TrendingRepository, useValue: mockRepository },
        { provide: EmbeddingProviderService, useValue: mockProvider },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(GapService);
    jest.clearAllMocks();
  });

  it('returns ranked gaps for a creator with niche, region, and content', async () => {
    // Arrange
    mockRepository.getUserNicheRegion.mockResolvedValue({
      niche: 'Food',
      region: 'GB',
    });
    mockRepository.isActiveRegion.mockResolvedValue(true);
    const gaps = [
      { topic: 'Air fryer recipes', platform: 'YOUTUBE', score: 0.72 },
      { topic: 'Fermentation basics', platform: 'INSTAGRAM', score: 0.65 },
    ];
    mockRepository.findGaps.mockResolvedValue(gaps);

    // Act
    const result = await service.getGaps(OWNER, null);

    // Assert
    expect(result).toEqual(gaps);
    expect(mockRepository.findGaps).toHaveBeenCalledWith(
      'text-embedding-3-small',
      OWNER,
      'Food',
      null,
      'GB',
      48,
    );
  });

  it('passes the platform filter through to the query', async () => {
    // Arrange
    mockRepository.getUserNicheRegion.mockResolvedValue({
      niche: 'Tech',
      region: 'US',
    });
    mockRepository.isActiveRegion.mockResolvedValue(true);
    mockRepository.findGaps.mockResolvedValue([
      { topic: 'AI phones', platform: 'YOUTUBE', score: 0.6 },
    ]);

    // Act
    await service.getGaps(OWNER, 'YOUTUBE');

    // Assert
    expect(mockRepository.findGaps).toHaveBeenCalledWith(
      expect.any(String),
      OWNER,
      'Tech',
      'YOUTUBE',
      'US',
      expect.any(Number),
    );
  });

  it('returns [] when the user has no niche set', async () => {
    // Arrange
    mockRepository.getUserNicheRegion.mockResolvedValue({
      niche: null,
      region: 'US',
    });

    // Act
    const result = await service.getGaps(OWNER, null);

    // Assert
    expect(result).toEqual([]);
    expect(mockRepository.findGaps).not.toHaveBeenCalled();
  });

  it("suppresses the 'Other' niche", async () => {
    // Arrange
    mockRepository.getUserNicheRegion.mockResolvedValue({
      niche: 'Other',
      region: 'US',
    });

    // Act
    const result = await service.getGaps(OWNER, null);

    // Assert
    expect(result).toEqual([]);
  });

  it('falls back to freshest niche topics for an empty catalogue', async () => {
    // Arrange
    mockRepository.getUserNicheRegion.mockResolvedValue({
      niche: 'Travel',
      region: 'US',
    });
    mockRepository.isActiveRegion.mockResolvedValue(true);
    mockRepository.findGaps.mockResolvedValue([]);
    mockRepository.hasAnyEmbedding.mockResolvedValue(false);
    const fallback = [{ topic: 'Iceland itinerary', platform: 'YOUTUBE', score: 1 }];
    mockRepository.findFallbackTopics.mockResolvedValue(fallback);

    // Act
    const result = await service.getGaps(OWNER, null);

    // Assert
    expect(result).toEqual(fallback);
  });

  it('returns [] (no fallback) when creator HAS embeddings but no fresh trending matches', async () => {
    // Arrange
    mockRepository.getUserNicheRegion.mockResolvedValue({
      niche: 'Travel',
      region: 'US',
    });
    mockRepository.isActiveRegion.mockResolvedValue(true);
    mockRepository.findGaps.mockResolvedValue([]);
    mockRepository.hasAnyEmbedding.mockResolvedValue(true);

    // Act
    const result = await service.getGaps(OWNER, null);

    // Assert
    expect(result).toEqual([]);
    expect(mockRepository.findFallbackTopics).not.toHaveBeenCalled();
  });

  it('defaults to US when the stored region is inactive', async () => {
    // Arrange
    mockRepository.getUserNicheRegion.mockResolvedValue({
      niche: 'Gaming',
      region: 'ZZ',
    });
    mockRepository.isActiveRegion.mockResolvedValue(false);
    mockRepository.findGaps.mockResolvedValue([]);
    mockRepository.hasAnyEmbedding.mockResolvedValue(true);

    // Act
    await service.getGaps(OWNER, null);

    // Assert
    expect(mockRepository.findGaps).toHaveBeenCalledWith(
      expect.any(String),
      OWNER,
      'Gaming',
      null,
      'US',
      expect.any(Number),
    );
  });
});
