import axios from 'axios';
import axiosRetry from 'axios-retry';

/**
 * Axios instance for server-side calls (Next.js API routes → Spring backend).
 * Auth header injected per-call — see lib/media/mediaApi.ts.
 *
 * Retry policy: GET requests retry up to 2 extra times (3 total attempts)
 * on network errors or 5xx responses.
 */
const axiosClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

axiosRetry(axiosClient, {
  retries: 2,
  retryCondition: (error) => {
    const isGet = error.config?.method?.toLowerCase() === 'get';
    const isNetworkOrServerError =
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500);
    return isGet && isNetworkOrServerError;
  },
  retryDelay: axiosRetry.exponentialDelay,
});

export default axiosClient;
