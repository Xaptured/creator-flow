import { ConfigService } from '@nestjs/config';

// Mock the OpenAI SDK so no real network/keys are needed.
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: { create: mockCreate },
  }));
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { EmbeddingProviderService } from './embedding-provider.service.js';

function makeConfig(values: Record<string, unknown>): ConfigService {
  return {
    getOrThrow: (k: string) => values[k],
    get: (k: string, def?: unknown) => (values[k] ?? def),
  } as unknown as ConfigService;
}

const vec1536 = Array(1536).fill(0.01);

describe('EmbeddingProviderService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a valid 1536-dim vector when EMBEDDING_DIM is a string env value', async () => {
    // Reproduces the bug: env vars arrive as strings ("1536"), not numbers.
    const provider = new EmbeddingProviderService(
      makeConfig({
        OPENAI_API_KEY: 'sk-test',
        OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
        EMBEDDING_DIM: '1536',
      }),
    );
    mockCreate.mockResolvedValue({ data: [{ embedding: vec1536 }] });

    const out = await provider.embed('hello');

    expect(out).toHaveLength(1536);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: ['hello'],
    });
  });

  it('throws on a genuine dimension mismatch', async () => {
    const provider = new EmbeddingProviderService(
      makeConfig({ OPENAI_API_KEY: 'sk-test', EMBEDDING_DIM: '1536' }),
    );
    mockCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });

    await expect(provider.embed('hi')).rejects.toThrow(/dimension mismatch/i);
  });
});
