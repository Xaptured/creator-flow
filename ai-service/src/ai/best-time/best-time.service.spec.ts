import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AnalyticsService } from '../../analytics/analytics.service.js';
import { ClaudeService } from '../claude/claude.service.js';
import { PromptService } from '../prompt/prompt.service.js';
import { BestTimeService, formatBlock } from './best-time.service.js';

const mockAnalytics = {
  getBestTimeBuckets: jest.fn(),
  getUserTimezone: jest.fn().mockResolvedValue('Asia/Kolkata'),
};
const mockClaude = { complete: jest.fn() };
const mockPrompt = {
  bestTimeSystem: jest.fn().mockReturnValue('system'),
  buildBestTimePrompt: jest.fn().mockReturnValue('user'),
};
const mockConfig = {
  get: jest.fn((key: string, fallback?: unknown) => fallback),
};

const OWNER = 'kc-uuid-1';

function bucket(
  dow: number,
  hourBlock: number,
  avgEngagement: number,
  sampleSize: number,
) {
  return { dow, hourBlock, avgEngagement, sampleSize };
}

describe('BestTimeService', () => {
  let service: BestTimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BestTimeService,
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: ClaudeService, useValue: mockClaude },
        { provide: PromptService, useValue: mockPrompt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(BestTimeService);
    jest.clearAllMocks();
    mockAnalytics.getUserTimezone.mockResolvedValue('Asia/Kolkata');
  });

  it('ranks qualifying buckets, labels slots, and returns the Claude narrative', async () => {
    // Arrange — repo already returns best-first (SQL ORDER BY)
    mockAnalytics.getBestTimeBuckets.mockResolvedValue([
      bucket(3, 18, 0.081, 4),
      bucket(5, 18, 0.062, 3),
      bucket(1, 9, 0.031, 2),
      bucket(0, 6, 0.09, 1), // viral one-off — below min samples
    ]);
    mockClaude.complete.mockResolvedValue(
      'Post on Wednesday evenings for best results.',
    );

    // Act
    const result = await service.getBestTime(OWNER, null);

    // Assert
    expect(result.timezone).toBe('Asia/Kolkata');
    expect(result.recommendation).toBe(
      'Post on Wednesday evenings for best results.',
    );
    expect(result.bestSlots).toHaveLength(3);
    expect(result.bestSlots[0]).toMatchObject({
      dow: 3,
      hourBlock: 18,
      label: 'Wednesday 6–9 PM',
    });
    // Low-sample bucket excluded from slots but present (flagged) in heatmap
    expect(
      result.bestSlots.find((slot) => slot.dow === 0 && slot.hourBlock === 6),
    ).toBeUndefined();
    expect(
      result.buckets.find((b) => b.dow === 0 && b.hourBlock === 6)?.lowSample,
    ).toBe(true);
  });

  it('returns the friendly empty state WITHOUT calling Claude when no bucket qualifies', async () => {
    // Arrange — only low-sample buckets
    mockAnalytics.getBestTimeBuckets.mockResolvedValue([bucket(2, 12, 0.05, 1)]);

    // Act
    const result = await service.getBestTime(OWNER, null);

    // Assert
    expect(result.bestSlots).toHaveLength(0);
    expect(result.recommendation).toContain('Not enough posting history');
    expect(mockClaude.complete).not.toHaveBeenCalled();
    expect(result.buckets).toHaveLength(1); // heatmap still gets the data
  });

  it('falls back to a template when Claude fails — endpoint never breaks on narrative', async () => {
    // Arrange
    mockAnalytics.getBestTimeBuckets.mockResolvedValue([bucket(5, 18, 0.07, 3)]);
    mockClaude.complete.mockRejectedValue(new Error('overloaded'));

    // Act
    const result = await service.getBestTime(OWNER, null);

    // Assert
    expect(result.recommendation).toBe('Best slot so far: Friday 6–9 PM.');
    expect(result.bestSlots).toHaveLength(1);
  });

  it('passes the platform filter through and echoes it in the response', async () => {
    // Arrange
    mockAnalytics.getBestTimeBuckets.mockResolvedValue([]);

    // Act
    const result = await service.getBestTime(OWNER, 'INSTAGRAM');

    // Assert
    expect(mockAnalytics.getBestTimeBuckets).toHaveBeenCalledWith(
      OWNER,
      'INSTAGRAM',
    );
    expect(result.platform).toBe('INSTAGRAM');
  });
});

describe('formatBlock', () => {
  it.each([
    [18, '6–9 PM'],
    [9, '9 AM–12 PM'],
    [21, '9 PM–12 AM'],
    [0, '12–3 AM'],
    [6, '6–9 AM'],
  ])('formats %i correctly', (start, expected) => {
    expect(formatBlock(start)).toBe(expected);
  });
});
