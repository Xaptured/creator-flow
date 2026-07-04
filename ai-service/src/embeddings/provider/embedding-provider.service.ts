import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Generates embedding vectors via OpenAI.
 *
 * Default model `text-embedding-3-small` returns 1536-dim vectors, matching the
 * `content_embeddings.embedding vector(1536)` column created in migration V17.
 *
 * NOTE: Anthropic has no embeddings endpoint — the CF-95 ticket's reference to
 * `@anthropic-ai/sdk` for embeddings is incorrect. Anthropic stays for text
 * generation (e.g. insights); embeddings use OpenAI.
 */
@Injectable()
export class EmbeddingProviderService {
  private readonly logger = new Logger(EmbeddingProviderService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly expectedDim: number;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = this.config.get<string>(
      'OPENAI_EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
    // ConfigService returns env vars as strings — the `<number>` generic is a
    // compile-time hint only and does NOT convert. Coerce explicitly, else the
    // strict `!==` dimension check below compares number vs string and always throws.
    this.expectedDim = Number(this.config.get('EMBEDDING_DIM', 1536));
  }

  /** Returns the model name embeddings are tagged with in the DB. */
  get modelName(): string {
    return this.model;
  }

  /** Embed a single text into a vector. */
  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  /**
   * Embed many texts in one request. OpenAI returns vectors in the same order
   * as the input array. Each vector is validated against the expected dimension.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });

    return response.data.map((item) => {
      const vector = item.embedding;
      if (vector.length !== this.expectedDim) {
        throw new Error(
          `Embedding dimension mismatch: got ${vector.length}, expected ${this.expectedDim} (model=${this.model})`,
        );
      }
      return vector;
    });
  }
}
