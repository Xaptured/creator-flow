import axios from 'axios';

/**
 * Axios instance for client-side calls to Next.js API routes only.
 * Does NOT call Spring backend directly — routes handle that server-side.
 * No retry: Next.js routes are not always idempotent (POST mutations).
 */
const browserAxiosClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

export default browserAxiosClient;
