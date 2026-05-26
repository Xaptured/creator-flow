import { Test, TestingModule } from '@nestjs/testing';

import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsSnapshot } from './model/snapshot.model.js';

const mockSnapshot: AnalyticsSnapshot = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  contentId: '550e8400-e29b-41d4-a716-446655440000',
  platform: 'YOUTUBE',
  views: 1000,
  likes: 50,
  comments: 10,
  snapshotAt: new Date('2024-01-01T00:00:00Z'),
};

const mockRepository = {
  getRecentSnapshots: jest.fn(),
  getTopPosts: jest.fn(),
};

const OWNER_ID = 'owner-uuid-1234';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  describe('getRecentSnapshots', () => {
    it('delegates to repository and returns snapshots', async () => {
      mockRepository.getRecentSnapshots.mockResolvedValue([mockSnapshot]);

      const result = await service.getRecentSnapshots(OWNER_ID);

      expect(mockRepository.getRecentSnapshots).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual([mockSnapshot]);
    });

    it('returns empty array when no snapshots exist', async () => {
      mockRepository.getRecentSnapshots.mockResolvedValue([]);

      const result = await service.getRecentSnapshots(OWNER_ID);

      expect(result).toEqual([]);
    });

    it('returns multiple snapshots in repository order', async () => {
      const snapshots = [
        mockSnapshot,
        { ...mockSnapshot, id: 'other-id', views: 500 },
      ];
      mockRepository.getRecentSnapshots.mockResolvedValue(snapshots);

      const result = await service.getRecentSnapshots(OWNER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].views).toBe(1000);
      expect(result[1].views).toBe(500);
    });
  });

  describe('getTopPosts', () => {
    it('delegates to repository and returns snapshots', async () => {
      mockRepository.getTopPosts.mockResolvedValue([mockSnapshot]);

      const result = await service.getTopPosts(OWNER_ID);

      expect(mockRepository.getTopPosts).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual([mockSnapshot]);
    });

    it('returns empty array when no posts exist', async () => {
      mockRepository.getTopPosts.mockResolvedValue([]);

      const result = await service.getTopPosts(OWNER_ID);

      expect(result).toEqual([]);
    });

    it('returns multiple top posts in repository order', async () => {
      const snapshots = [
        { ...mockSnapshot, views: 9000, likes: 400 },
        { ...mockSnapshot, id: 'second-id', views: 3000, likes: 100 },
      ];
      mockRepository.getTopPosts.mockResolvedValue(snapshots);

      const result = await service.getTopPosts(OWNER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].views).toBe(9000);
      expect(result[1].views).toBe(3000);
    });
  });
});
