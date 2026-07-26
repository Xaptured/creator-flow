import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeTextResponse {
  content: string;
}

/** Base64 image input for vision requests. */
export interface ClaudeImageInput {
  mediaType: 'image/jpeg' | 'image/png';
  dataBase64: string;
}

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeService.name);
  private static readonly MODEL = 'claude-haiku-4-5-20251001';

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    this.logger.debug(`Claude request — model: ${ClaudeService.MODEL}`);

    const message = await this.client.messages.create({
      model: ClaudeService.MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error(`Unexpected Claude response block type: ${block.type}`);
    }

    return block.text;
  }

  /**
   * Vision completion: images + text in a single user message (CF-96
   * thumbnail scoring sends all 4 frames in one call).
   */
  async completeWithImages(
    systemPrompt: string,
    userPrompt: string,
    images: ClaudeImageInput[],
  ): Promise<string> {
    this.logger.debug(
      `Claude vision request — model: ${ClaudeService.MODEL}, images: ${images.length}`,
    );

    const message = await this.client.messages.create({
      model: ClaudeService.MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            ...images.map((image) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: image.mediaType,
                data: image.dataBase64,
              },
            })),
            { type: 'text' as const, text: userPrompt },
          ],
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error(`Unexpected Claude response block type: ${block.type}`);
    }

    return block.text;
  }
}
