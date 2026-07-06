import { Test, TestingModule } from '@nestjs/testing';

import { ClaudeService } from '../../ai/claude/claude.service.js';
import { RawTrend } from '../model/raw-trend.model.js';
import { TopicNormalizerService } from './topic-normalizer.service.js';

const mockClaude = {
  complete: jest.fn(),
};

function rawTrend(overrides: Partial<RawTrend> = {}): RawTrend {
  return {
    platform: 'YOUTUBE',
    rawText: 'INSANE new camera gear!! 🔥🔥 (NOT CLICKBAIT)',
    sourceRef: 'vid-1',
    region: 'US',
    ...overrides,
  };
}

describe('TopicNormalizerService', () => {
  let service: TopicNormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicNormalizerService,
        { provide: ClaudeService, useValue: mockClaude },
      ],
    }).compile();
    service = module.get(TopicNormalizerService);
    jest.clearAllMocks();
  });

  it('normalizes raw titles into topic + canonical niche', async () => {
    // Arrange
    mockClaude.complete.mockResolvedValue(
      JSON.stringify([{ topic: 'New camera gear review', niche: 'Photography' }]),
    );

    // Act
    const result = await service.normalize([rawTrend()]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].normalized).toEqual({
      topic: 'New camera gear review',
      niche: 'Photography',
    });
  });

  it('drops items whose niche is not in the canonical set', async () => {
    // Arrange
    mockClaude.complete.mockResolvedValue(
      JSON.stringify([{ topic: 'Something', niche: 'Cryptocurrency' }]),
    );

    // Act
    const result = await service.normalize([rawTrend()]);

    // Assert
    expect(result).toHaveLength(0);
  });

  it('drops the whole batch when Claude output is malformed JSON', async () => {
    // Arrange
    mockClaude.complete.mockResolvedValue('sorry, I cannot help with that');

    // Act
    const result = await service.normalize([rawTrend()]);

    // Assert
    expect(result).toHaveLength(0);
  });

  it('drops the batch when Claude returns wrong array length', async () => {
    // Arrange
    mockClaude.complete.mockResolvedValue(
      JSON.stringify([
        { topic: 'A', niche: 'Tech' },
        { topic: 'B', niche: 'Tech' },
      ]),
    );

    // Act
    const result = await service.normalize([rawTrend()]);

    // Assert
    expect(result).toHaveLength(0);
  });

  it('tolerates markdown fences around otherwise valid JSON', async () => {
    // Arrange
    mockClaude.complete.mockResolvedValue(
      '```json\n[{"topic":"Monday motivation","niche":"Lifestyle"}]\n```',
    );

    // Act
    const result = await service.normalize([
      rawTrend({ platform: 'TWITTER', rawText: '#MondayMotivation' }),
    ]);

    // Assert
    expect(result[0].normalized.topic).toBe('Monday motivation');
  });

  it('prefers the curated nicheHint (IG map) over Claude classification', async () => {
    // Arrange
    mockClaude.complete.mockResolvedValue(
      JSON.stringify([{ topic: 'Meal prep ideas', niche: 'Lifestyle' }]),
    );

    // Act
    const result = await service.normalize([
      rawTrend({ platform: 'INSTAGRAM', nicheHint: 'Food', region: 'GLOBAL' }),
    ]);

    // Assert
    expect(result[0].normalized.niche).toBe('Food');
  });

  it('drops malformed items but keeps valid ones in the same batch', async () => {
    // Arrange
    mockClaude.complete.mockResolvedValue(
      JSON.stringify([
        { topic: 'Valid topic', niche: 'Gaming' },
        { topic: '', niche: 'Gaming' },
      ]),
    );

    // Act
    const result = await service.normalize([
      rawTrend(),
      rawTrend({ sourceRef: 'vid-2' }),
    ]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].normalized.topic).toBe('Valid topic');
  });
});
