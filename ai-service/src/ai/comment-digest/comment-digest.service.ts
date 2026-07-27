import { Injectable, Logger } from '@nestjs/common';

import { ClaudeService } from '../claude/claude.service.js';
import { PromptService } from '../prompt/prompt.service.js';
import {
  AnalyticsCommentsClient,
  ChannelComment,
} from './analytics-comments.client.js';
import {
  CommentDigestItem,
  CommentDigestResponse,
} from './dto/comment-digest.response.js';

const COMMENT_LIMIT = 50;
const MAX_ITEMS = 5;
const MAX_FIELD_LENGTH = 300;

/**
 * Comment digest (CF-96 Day 5). Aggregates recent comments across the
 * creator's whole YouTube channel and asks Claude for the top audience
 * questions plus a content idea for each — NOT tied to a single post.
 *
 * Zero comments → empty digest, Claude NOT called (no wasted tokens).
 * Claude parse failure → one strict-format retry, then error.
 */
@Injectable()
export class CommentDigestService {
  private readonly logger = new Logger(CommentDigestService.name);

  constructor(
    private readonly commentsClient: AnalyticsCommentsClient,
    private readonly claudeService: ClaudeService,
    private readonly promptService: PromptService,
  ) {}

  async generateDigest(
    ownerId: string,
    accessToken: string,
  ): Promise<CommentDigestResponse> {
    const comments = await this.commentsClient.fetchRecentComments(
      ownerId,
      accessToken,
      COMMENT_LIMIT,
    );

    if (comments.length === 0) {
      this.logger.log(`No recent comments for owner ${ownerId} — empty digest`);
      return this.emptyDigest(ownerId);
    }

    const items = await this.summarise(comments);
    return {
      ownerId,
      items,
      commentCount: comments.length,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Claude call with one strict-format retry on unparseable output. */
  private async summarise(
    comments: ChannelComment[],
  ): Promise<CommentDigestItem[]> {
    const system = this.promptService.commentDigestSystem();
    const user = this.promptService.buildCommentDigestPrompt(comments);

    const raw = await this.claudeService.complete(system, user);
    const first = this.tryParse(raw);
    if (first !== null) return first;

    this.logger.warn('Digest parse failed — retrying with strict reminder');
    const retryRaw = await this.claudeService.complete(
      system,
      `${user}\n\nIMPORTANT: your previous reply was not valid JSON. Reply with ONLY the JSON object described in the system prompt.`,
    );
    const second = this.tryParse(retryRaw);
    if (second !== null) return second;

    this.logger.error(`Digest unparseable after retry. Raw: ${retryRaw}`);
    throw new Error('Claude returned an unparseable response');
  }

  /** Parses `{ "items": [ { question, idea } ] }`; null when malformed. */
  private tryParse(raw: string): CommentDigestItem[] | null {
    try {
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '');
      const parsed = JSON.parse(cleaned) as { items?: unknown };
      if (!Array.isArray(parsed.items)) return null;

      const items = parsed.items
        .filter(
          (item): item is CommentDigestItem =>
            typeof (item as CommentDigestItem)?.question === 'string' &&
            typeof (item as CommentDigestItem)?.idea === 'string',
        )
        .slice(0, MAX_ITEMS)
        .map((item) => ({
          question: item.question.trim().slice(0, MAX_FIELD_LENGTH),
          idea: item.idea.trim().slice(0, MAX_FIELD_LENGTH),
        }))
        .filter((item) => item.question.length > 0 && item.idea.length > 0);

      return items.length > 0 ? items : null;
    } catch {
      return null;
    }
  }

  private emptyDigest(ownerId: string): CommentDigestResponse {
    return {
      ownerId,
      items: [],
      commentCount: 0,
      generatedAt: new Date().toISOString(),
    };
  }
}
