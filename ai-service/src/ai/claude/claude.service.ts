import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeTextResponse {
  content: string;
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
}
