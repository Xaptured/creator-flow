import { Injectable, Logger } from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service.js';
import { ClaudeService } from './claude/claude.service.js';
import { CaptionRequest } from './dto/request/caption.request.js';
import { HashtagRequest } from './dto/request/hashtag.request.js';
import {
  CaptionResponse,
  CaptionTone,
  CaptionVariant,
} from './dto/response/caption.response.js';
import {
  HashtagItem,
  HashtagResponse,
  VolumeCategory,
} from './dto/response/hashtag.response.js';
import { Insight, InsightsResponse } from './dto/response/insight.response.js';
import { PromptService } from './prompt/prompt.service.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly claudeService: ClaudeService,
    private readonly promptService: PromptService,
  ) {}

  async getInsights(ownerId: string): Promise<InsightsResponse> {
    const [recent, topPosts] = await Promise.all([
      this.analyticsService.getRecentSnapshots(ownerId),
      this.analyticsService.getTopPosts(ownerId),
    ]);

    const raw = await this.claudeService.complete(
      this.promptService.insightsSystem(),
      this.promptService.buildInsightsPrompt(recent, topPosts),
    );

    const parsed = this.parseJson<{ insights: Insight[] }>(raw, 'insights');
    return { ownerId, insights: parsed.insights };
  }

  async generateCaptions(request: CaptionRequest): Promise<CaptionResponse> {
    const raw = await this.claudeService.complete(
      this.promptService.captionSystem(),
      this.promptService.buildCaptionPrompt(
        request.title,
        request.platform,
        request.niche,
      ),
    );

    const parsed = this.parseJson<{ captions: CaptionVariant[] }>(
      raw,
      'captions',
    );

    const tones: CaptionTone[] = [
      'professional',
      'casual',
      'hype',
      'informative',
    ];
    const captions = tones.map((tone) => {
      const found = parsed.captions.find((c) => c.tone === tone);
      return found ?? { tone, caption: '' };
    });

    return { captions };
  }

  async generateHashtags(request: HashtagRequest): Promise<HashtagResponse> {
    const raw = await this.claudeService.complete(
      this.promptService.hashtagSystem(),
      this.promptService.buildHashtagPrompt(
        request.description,
        request.platform,
      ),
    );

    const parsed = this.parseJson<{ hashtags: HashtagItem[] }>(raw, 'hashtags');

    const validCategories: VolumeCategory[] = ['high', 'mid', 'niche'];
    const hashtags = parsed.hashtags.map((h) => ({
      hashtag: h.hashtag.startsWith('#') ? h.hashtag : `#${h.hashtag}`,
      volumeCategory: validCategories.includes(h.volumeCategory)
        ? h.volumeCategory
        : 'mid',
    }));

    return { hashtags };
  }

  private parseJson<T>(raw: string, expectedKey: string): T {
    try {
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '');
      const parsed = JSON.parse(cleaned) as T;
      if (!(expectedKey in (parsed as object))) {
        throw new Error(`Missing key "${expectedKey}" in Claude response`);
      }
      return parsed;
    } catch (err) {
      this.logger.error(
        `Failed to parse Claude JSON response: ${String(err)}\nRaw: ${raw}`,
      );
      throw new Error('Claude returned an unparseable response');
    }
  }
}
