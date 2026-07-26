import { Injectable } from '@nestjs/common';

import { AnalyticsSnapshot } from '../../analytics/model/snapshot.model.js';

/** Structural slot shape for best-time prompts (avoids a dto import cycle). */
export interface BestTimePromptSlot {
  label: string;
  avgEngagement: number;
  sampleSize: number;
}

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
  bestTimeSystem(): string {
    return (
      `You recommend optimal social posting times from engagement data.\n` +
      `Reply with 1-2 plain sentences only - no lists, no markdown.\n` +
      `Refer to days and times exactly as given in the data.`
    );
  }

  buildBestTimePrompt(slots: BestTimePromptSlot[], timezone: string): string {
    const table = slots
      .map(
        (slot) =>
          `  ${slot.label} - avg engagement ${(slot.avgEngagement * 100).toFixed(1)}% over ${slot.sampleSize} posts`,
      )
      .join('\n');
    return (
      `Creator timezone: ${timezone}\n` +
      `Top posting slots by average engagement:\n${table}\n\n` +
      `When should this creator post? Answer in 1-2 sentences.`
    );
  }

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

  thumbnailScoreSystem(): string {
    return (
      `You rate YouTube thumbnail candidates for click-through-rate potential.\n` +
      `Return ONLY valid JSON — no prose, no markdown fences.\n` +
      `Schema: { "frames": [ { "frameIndex": number, "score": number, "reasoning": string } ] }\n` +
      `Score each image 1-10 (integer, higher = better CTR potential).\n` +
      `Consider: text readability, face visibility, contrast, emotional impact.\n` +
      `Return exactly one object per image, frameIndex matching the image order starting at 0.\n` +
      `Keep each reasoning to 1-2 sentences.`
    );
  }

  buildThumbnailScorePrompt(frameCount: number): string {
    return (
      `The ${frameCount} images above are candidate thumbnails extracted from one YouTube video ` +
      `at 10%, 25%, 50%, and 75% of its duration (frameIndex 0-${frameCount - 1} in that order).\n` +
      `Score each thumbnail 1-10 for YouTube CTR potential and explain briefly.`
    );
  }

  commentDigestSystem(): string {
    return (
      `You analyse YouTube audience comments for a content creator.\n` +
      `Return ONLY valid JSON — no prose, no markdown fences.\n` +
      `Schema: { "items": [ { "question": string, "idea": string } ] }\n` +
      `Return up to 5 items: "question" is a recurring question or content request the audience is raising, ` +
      `"idea" is one concrete, actionable video idea answering it.\n` +
      `Merge near-duplicate questions. If the comments contain fewer distinct questions, return fewer items.`
    );
  }

  buildCommentDigestPrompt(
    comments: { author: string; text: string; likeCount: number }[],
  ): string {
    const list = comments
      .map(
        (comment, index) =>
          `  ${index + 1}. [likes: ${comment.likeCount}] ${comment.author}: ${comment.text}`,
      )
      .join('\n');
    return (
      `Recent comments from this creator's YouTube channel (newest first):\n${list}\n\n` +
      `Summarise the top questions / content requests this audience is asking, ` +
      `and give one video idea per question. Weight comments with more likes higher.`
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
