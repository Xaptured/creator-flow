import { RawTrend } from '../model/raw-trend.model.js';

/**
 * One trending fetch client per platform. Only the fetch differs per platform —
 * normalization, embedding and persistence are shared (TrendingService).
 */
export interface TrendingClient {
  /**
   * Fetch current trending items for the given region (ISO 3166-1 alpha-2).
   * Region-independent platforms (Instagram) ignore the argument and tag rows GLOBAL.
   * A disabled client (env flag) returns [] without calling out.
   */
  fetch(region: string): Promise<RawTrend[]>;
}
