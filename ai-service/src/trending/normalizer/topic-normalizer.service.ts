import { Injectable, Logger } from '@nestjs/common';

import { ClaudeService } from '../../ai/claude/claude.service.js';
import {
  CANONICAL_NICHES,
  NormalizedTopic,
} from '../model/normalized-topic.model.js';
import { RawTrend } from '../model/raw-trend.model.js';

/** Claude batch size — keeps each completion well under max_tokens. */
const BATCH_SIZE = 25;

const SYSTEM_PROMPT = `You normalize raw social-media trending items into clean topics for semantic search.

For EACH input item:
1. Extract a concise, human-readable TOPIC phrase (3-8 words). Strip clickbait, emoji, hashtags symbols, ALL-CAPS shouting. A bare hashtag like "#MondayMotivation" becomes "Monday motivation".
2. Classify the topic into EXACTLY ONE of these niches:
${CANONICAL_NICHES.map((niche) => `- ${niche}`).join('\n')}
If unclear, use "Other".

Respond with ONLY a JSON array, same length and order as the input, no markdown fences, no commentary:
[{"topic":"...","niche":"..."}]`;

/**
 * Normalizes raw trends (clickbait YouTube titles, bare X hashtags, IG captions)
 * into clean topic phrases + canonical niches via one Claude call per batch.
 * Raw text makes noisy embeddings; normalization keeps the vector space clean.
 */
@Injectable()
export class TopicNormalizerService {
  private readonly logger = new Logger(TopicNormalizerService.name);
  private readonly canonicalNiches = new Set(CANONICAL_NICHES);

  constructor(private readonly claudeService: ClaudeService) {}

  /**
   * Normalize raw trends. Malformed Claude rows are dropped (logged), never guessed.
   * When a RawTrend carries a `nicheHint` (IG curated map), the hint wins over
   * Claude's classification — the map is ground truth.
   * Returns pairs aligned with the surviving raw items.
   */
  async normalize(
    rawTrends: RawTrend[],
  ): Promise<{ raw: RawTrend; normalized: NormalizedTopic }[]> {
    const results: { raw: RawTrend; normalized: NormalizedTopic }[] = [];

    for (let i = 0; i < rawTrends.length; i += BATCH_SIZE) {
      const batch = rawTrends.slice(i, i + BATCH_SIZE);
      const batchResults = await this.normalizeBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async normalizeBatch(
    batch: RawTrend[],
  ): Promise<{ raw: RawTrend; normalized: NormalizedTopic }[]> {
    const userPrompt = JSON.stringify(
      batch.map((trend) => ({
        text: trend.rawText,
        platform: trend.platform,
      })),
    );

    const completion = await this.claudeService.complete(
      SYSTEM_PROMPT,
      userPrompt,
    );

    const parsed = this.parseStrictJson(completion);
    if (parsed === null || parsed.length !== batch.length) {
      this.logger.warn(
        `Dropping batch of ${batch.length} — Claude output malformed or wrong length`,
      );
      return [];
    }

    const results: { raw: RawTrend; normalized: NormalizedTopic }[] = [];
    for (let i = 0; i < batch.length; i += 1) {
      const item = parsed[i];
      const raw = batch[i];
      if (!this.isValidItem(item)) {
        this.logger.warn(
          `Dropping malformed normalized item for "${raw.rawText}"`,
        );
        continue;
      }
      // Curated niche hint (IG map) is ground truth — overrides Claude.
      const niche =
        raw.nicheHint && this.canonicalNiches.has(raw.nicheHint)
          ? raw.nicheHint
          : item.niche;
      results.push({ raw, normalized: { topic: item.topic.trim(), niche } });
    }
    return results;
  }

  private parseStrictJson(text: string): NormalizedTopic[] | null {
    // Tolerate accidental markdown fences, nothing else.
    const stripped = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    try {
      const parsed: unknown = JSON.parse(stripped);
      return Array.isArray(parsed) ? (parsed as NormalizedTopic[]) : null;
    } catch {
      return null;
    }
  }

  private isValidItem(item: unknown): item is NormalizedTopic {
    if (typeof item !== 'object' || item === null) return false;
    const candidate = item as Record<string, unknown>;
    return (
      typeof candidate.topic === 'string' &&
      candidate.topic.trim().length > 0 &&
      candidate.topic.length <= 500 &&
      typeof candidate.niche === 'string' &&
      this.canonicalNiches.has(candidate.niche)
    );
  }
}
