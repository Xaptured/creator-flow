import { Injectable } from '@nestjs/common';

import { AnalyticsSnapshot } from '../../analytics/model/snapshot.model.js';

export interface BuiltPrompt {
  system: string;
  user: string;
}

/**
 * Owns all Claude prompt construction for the AI module.
 * Centralises prompt engineering so changes to tone, schema, or
 * platform constraints are made in one place.
 */
@Injectable()
export class PromptService {
  insightsSystem(): string {
    return (
      `You are a social media analytics expert.\n` +
      `Analyse the creator's data and return ONLY valid JSON — no prose, no markdown fences.\n` +
      `Schema: { "insights": [ { "title": string, "description": string, "actionableStep": string } ] }\n` +
      `Return exactly 3 insight objects.`
    );
  }

  captionSystem(): string {
    return (
      `You are a social media copywriter.\n` +
      `Return ONLY valid JSON — no prose, no markdown fences.\n` +
      `Schema: { "captions": [ { "tone": "professional"|"casual"|"hype"|"informative", "caption": string } ] }\n` +
      `Return exactly 4 caption objects, one per tone.`
    );
  }

  hashtagSystem(): string {
    return (
      `You are a social media hashtag strategist.\n` +
      `Return ONLY valid JSON — no prose, no markdown fences.\n` +
      `Schema: { "hashtags": [ { "hashtag": string, "volumeCategory": "high"|"mid"|"niche" } ] }\n` +
      `Return exactly 15 hashtag objects. Include the # prefix in each hashtag string.`
    );
  }

  buildInsightsPrompt(
    recent: AnalyticsSnapshot[],
    topPosts: AnalyticsSnapshot[],
  ): string {
    const platformBreakdown = this.summariseByPlatform(recent);
    const topPostsSummary =
      topPosts
        .slice(0, 5)
        .map(
          (s) =>
            `  contentId=${s.contentId} platform=${s.platform} views=${s.views} likes=${s.likes} comments=${s.comments}`,
        )
        .join('\n') || '  (no top posts found)';

    return (
      `Here is the creator's last 30 days of analytics data:\n\n` +
      `Platform breakdown (total views / likes / comments):\n${platformBreakdown}\n\n` +
      `Top performing posts:\n${topPostsSummary}\n\n` +
      `Total snapshots analysed: ${recent.length}\n\n` +
      `Given these metrics, provide 3 actionable insights to improve performance.`
    );
  }

  buildCaptionPrompt(title: string, platform: string, niche: string): string {
    return (
      `Generate 4 caption variants for the following post:\n` +
      `Title: ${title}\n` +
      `Platform: ${platform}\n` +
      `Niche: ${niche}\n\n` +
      `Tones required: professional, casual, hype, informative.\n` +
      `Respect platform conventions (e.g. Instagram allows up to 2,200 chars, YouTube descriptions up to 5,000).`
    );
  }

  buildHashtagPrompt(description: string, platform: string): string {
    return (
      `Generate 15 hashtags for the following post:\n` +
      `Description: ${description}\n` +
      `Platform: ${platform}\n\n` +
      `Distribute across high-volume, mid-volume, and niche categories.`
    );
  }

  private summariseByPlatform(snapshots: AnalyticsSnapshot[]): string {
    const byPlatform = snapshots.reduce<
      Record<string, { views: number; likes: number; comments: number }>
    >((acc, s) => {
      const entry = acc[s.platform] ?? { views: 0, likes: 0, comments: 0 };
      return {
        ...acc,
        [s.platform]: {
          views: entry.views + s.views,
          likes: entry.likes + s.likes,
          comments: entry.comments + s.comments,
        },
      };
    }, {});

    return (
      Object.entries(byPlatform)
        .map(
          ([p, v]) =>
            `  ${p}: views=${v.views} likes=${v.likes} comments=${v.comments}`,
        )
        .join('\n') || '  (no data)'
    );
  }
}
