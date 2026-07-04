import { Test, TestingModule } from '@nestjs/testing';

import { EmbeddingsRepository } from './embeddings.repository.js';
import { EmbeddingsService } from './embeddings.service.js';
import { EmbeddingProviderService } from './provider/embedding-provider.service.js';

const mockRepository = {
  upsert: jest.fn(),
  getContentText: jest.fn(),
  findPublishedWithoutEmbedding: jest.fn(),
};

const mockProvider = {
  modelName: 'text-embedding-3-small',
  embed: jest.fn(),
  embedBatch: jest.fn(),
};

const VECTOR = Array(1536).fill(0.1);

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingsService,
        { provide: EmbeddingsRepository, useValue: mockRepository },
        { provide: EmbeddingProviderService, useValue: mockProvider },
      ],
    }).compile();
    service = module.get<EmbeddingsService>(EmbeddingsService);
    jest.clearAllMocks();
  });

  describe('embedContent', () => {
    it('embeds and upserts when content has text', async () => {
      mockRepository.getContentText.mockResolvedValue({
        contentId: 'c1',
        title: 'Title',
        description: 'Body',
      });
      mockProvider.embed.mockResolvedValue(VECTOR);
      mockRepository.upsert.mockResolvedValue({ model: 'text-embedding-3-small' });

      await service.embedContent('c1');

      expect(mockProvider.embed).toHaveBeenCalledWith('Title\n\nBody');
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        'c1',
        'text-embedding-3-small',
        VECTOR,
      );
    });

    it('skips when content not found', async () => {
      mockRepository.getContentText.mockResolvedValue(null);

      const result = await service.embedContent('missing');

      expect(result).toBeNull();
      expect(mockProvider.embed).not.toHaveBeenCalled();
      expect(mockRepository.upsert).not.toHaveBeenCalled();
    });

    it('skips when composed text is empty', async () => {
      mockRepository.getContentText.mockResolvedValue({
        contentId: 'c1',
        title: '',
        description: null,
      });

      const result = await service.embedContent('c1');

      expect(result).toBeNull();
      expect(mockProvider.embed).not.toHaveBeenCalled();
    });
  });

  describe('backfill', () => {
    it('embeds a page then stops when no rows remain', async () => {
      mockRepository.findPublishedWithoutEmbedding
        .mockResolvedValueOnce([
          { contentId: 'a', title: 'A', description: null },
          { contentId: 'b', title: 'B', description: 'desc' },
        ])
        .mockResolvedValueOnce([]);
      mockProvider.embedBatch.mockResolvedValue([VECTOR, VECTOR]);
      mockRepository.upsert.mockResolvedValue({});

      const result = await service.backfill();

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockRepository.upsert).toHaveBeenCalledTimes(2);
    });

    it('counts rows with empty text as skipped', async () => {
      mockRepository.findPublishedWithoutEmbedding
        .mockResolvedValueOnce([{ contentId: 'a', title: '', description: null }])
        .mockResolvedValueOnce([]);

      const result = await service.backfill();

      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(0);
      expect(mockProvider.embedBatch).not.toHaveBeenCalled();
    });
  });
});
