/**
 * Environment variable keys used by the SQS consumer.
 * Centralised here so string literals never appear in service code.
 */
export const ENV = {
  AWS_REGION: 'AWS_REGION',
  AI_PROCESSING_QUEUE_URL: 'AI_PROCESSING_QUEUE_URL',
  DISABLE_SQS_POLLING: 'DISABLE_SQS_POLLING',
} as const;

export const DEFAULTS = {
  AWS_REGION: 'ap-south-1',
} as const;
