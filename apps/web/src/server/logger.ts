import pino, { type DestinationStream, type Logger } from 'pino';

export const REDACT_PATHS = [
  'password',
  '*.password',
  'token',
  '*.token',
  'cookie',
  '*.cookie',
  'headers.cookie',
  'headers.authorization',
  'authorization',
  'apiKey',
  '*.apiKey',
  'OPENROUTER_API_KEY',
];

export function createLogger(stream?: DestinationStream): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
    },
    stream,
  );
}

export const logger: Logger = createLogger();
