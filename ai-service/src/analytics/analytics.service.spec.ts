import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import {
  IngestAnalyticsRequest,
  Platform,
} from './dto/ingest-analytics.request.js';
import { IngestAnalyticsResponse } from './dto/ingest-analytics.response.js';

const mockRepository = { insertSnapshot: jest.fn() };

const validRequest: IngestAnalyticsRequest = {
  contentId: '550e8400-e29b-41d4-a716-446655440000',
  platform: 'YOUTUBE',
  views: 1000,
  likes: 50,
  comments: 10,
};

const mockResponse: IngestAnalyticsResponse = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  contentId: validRequest.contentId,
  platform: 'YOUTUBE',
  views: 1000,
  likes: 50,
  comments: 10,
  snapshotAt: new Date('2024-01-01T00:00:00Z'),
};

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

  describe('ingest', () => {
    it('inserts snapshot and returns response on valid request', async () => {
      mockRepository.insertSnapshot.mockResolvedValue(mockResponse);
      const result = await service.ingest(validRequest);
      expect(mockRepository.insertSnapshot).toHaveBeenCalledWith(validRequest);
      expect(result).toEqual(mockResponse);
    });

    it('passes snapshotAt through to repository when provided', async () => {
      const req = { ...validRequest, snapshotAt: '2024-06-01T12:00:00Z' };
      mockRepository.insertSnapshot.mockResolvedValue(mockResponse);
      await service.ingest(req);
      expect(mockRepository.insertSnapshot).toHaveBeenCalledWith(req);
    });

    it('throws BadRequestException when contentId is missing', async () => {
      await expect(
        service.ingest({ ...validRequest, contentId: '' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.insertSnapshot).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for invalid platform', async () => {
      await expect(
        service.ingest({
          ...validRequest,
          platform: 'TIKTOK' as Platform,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.insertSnapshot).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when views is negative', async () => {
      await expect(
        service.ingest({ ...validRequest, views: -1 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.insertSnapshot).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when likes is negative', async () => {
      await expect(
        service.ingest({ ...validRequest, likes: -5 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.insertSnapshot).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when comments is negative', async () => {
      await expect(
        service.ingest({ ...validRequest, comments: -2 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.insertSnapshot).not.toHaveBeenCalled();
    });

    it('accepts zero values for views, likes, comments', async () => {
      const req = { ...validRequest, views: 0, likes: 0, comments: 0 };
      mockRepository.insertSnapshot.mockResolvedValue({
        ...mockResponse,
        views: 0,
        likes: 0,
        comments: 0,
      });
      const result = await service.ingest(req);
      expect(result.views).toBe(0);
    });

    it('accepts all three valid platform values', async () => {
      mockRepository.insertSnapshot.mockResolvedValue(mockResponse);
      for (const platform of ['YOUTUBE', 'INSTAGRAM', 'TWITTER'] as const) {
        await expect(
          service.ingest({ ...validRequest, platform }),
        ).resolves.not.toThrow();
      }
      expect(mockRepository.insertSnapshot).toHaveBeenCalledTimes(3);
    });
  });
});
