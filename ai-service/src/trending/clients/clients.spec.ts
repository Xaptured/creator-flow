import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { XTrendingClient } from './x-trending.client.js';
import { YoutubeTrendingClient } from './youtube-trending.client.js';

function makeConfig(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
    getOrThrow: jest.fn((key: string) => {
      if (!(key in values)) throw new Error(`Missing config ${key}`);
      return values[key];
    }),
  };
}

async function buildClient<T>(
  token: new (...args: never[]) => T,
  values: Record<string, string>,
): Promise<T> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [token, { provide: ConfigService, useValue: makeConfig(values) }],
  }).compile();
  return module.get(token);
}

describe('YoutubeTrendingClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps videos.list payload to RawTrend[]', async () => {
    // Arrange
    const client = await buildClient(YoutubeTrendingClient, {
      TRENDING_YOUTUBE_ENABLED: 'true',
      YOUTUBE_API_KEY: 'key',
    });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { id: 'vid-1', snippet: { title: 'Trending video one' } },
            { id: 'vid-2', snippet: {} }, // no title — dropped
          ],
        }),
    } as unknown as Response);

    // Act
    const trends = await client.fetch('US');

    // Assert
    expect(trends).toEqual([
      {
        platform: 'YOUTUBE',
        rawText: 'Trending video one',
        sourceRef: 'vid-1',
        region: 'US',
      },
    ]);
  });

  it('returns [] without fetching when disabled', async () => {
    // Arrange
    const client = await buildClient(YoutubeTrendingClient, {
      TRENDING_YOUTUBE_ENABLED: 'false',
    });
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    // Act
    const trends = await client.fetch('US');

    // Assert
    expect(trends).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws on a non-OK response', async () => {
    // Arrange
    const client = await buildClient(YoutubeTrendingClient, {
      TRENDING_YOUTUBE_ENABLED: 'true',
      YOUTUBE_API_KEY: 'key',
    });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as unknown as Response);

    // Act + Assert
    await expect(client.fetch('US')).rejects.toThrow('403');
  });
});

describe('XTrendingClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('no-ops when TRENDING_X_ENABLED is false', async () => {
    // Arrange
    const client = await buildClient(XTrendingClient, {
      TRENDING_X_ENABLED: 'false',
    });
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    // Act
    const trends = await client.fetch('US');

    // Assert
    expect(trends).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps trends payload and tags rows with the ISO region code', async () => {
    // Arrange
    const client = await buildClient(XTrendingClient, {
      TRENDING_X_ENABLED: 'true',
      X_API_BEARER_TOKEN: 'token',
    });
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ data: [{ trend_name: '#MondayMotivation', tweet_count: 1200 }] }),
    } as unknown as Response);

    // Act
    const trends = await client.fetch('GB');

    // Assert — GB WOEID used in URL, row tagged 'GB'
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('23424975'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    );
    expect(trends).toEqual([
      {
        platform: 'TWITTER',
        rawText: '#MondayMotivation',
        sourceRef: '#MondayMotivation',
        region: 'GB',
      },
    ]);
  });

  it('skips regions with no WOEID mapping', async () => {
    // Arrange
    const client = await buildClient(XTrendingClient, {
      TRENDING_X_ENABLED: 'true',
      X_API_BEARER_TOKEN: 'token',
    });
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    // Act
    const trends = await client.fetch('ZZ');

    // Assert
    expect(trends).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
