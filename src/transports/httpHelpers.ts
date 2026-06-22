import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ServerLogger } from '../logs/serverLogger.js';

export function trimBody(text: string, maxBodyChars: number): string {
  if (text.length <= maxBodyChars) return text;
  return `${text.slice(0, maxBodyChars)}...[truncated ${text.length - maxBodyChars} chars]`;
}

export async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function parseJsonBody(bodyText: string, logger: ServerLogger): Promise<unknown> {
  if (bodyText.trim().length === 0) return undefined;
  try {
    return JSON.parse(bodyText);
  } catch (err) {
    await logger.error('http request json parse failed', err);
    return undefined;
  }
}

export function normalizeInitializedNotificationParams(parsedBody: unknown, logger: ServerLogger, debug: boolean): void {
  const methodName =
    parsedBody &&
    typeof parsedBody === 'object' &&
    'method' in parsedBody &&
    typeof (parsedBody as { method?: unknown }).method === 'string'
      ? (parsedBody as { method: string }).method
      : '';

  if (methodName === 'notifications/initialized' && parsedBody && typeof parsedBody === 'object') {
    const body = parsedBody as { params?: unknown };
    if (body.params === undefined) {
      body.params = {};
      if (debug) {
        void logger.info('http request notifications/initialized normalized with empty params');
      }
    }
  }
}

export async function handleRequestFailure(params: {
  logger: ServerLogger;
  path: string;
  res: ServerResponse;
  err: unknown;
}): Promise<void> {
  const { logger, path, res, err } = params;
  await logger.error(`http request handling failed path=${path}`, err);
  if (!res.headersSent) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

export function attachListenErrorHandler(params: {
  logger: ServerLogger;
  host: string;
  port: number;
  protocolLabel: 'http' | 'https';
  on: (event: 'error', cb: (err: unknown) => void) => void;
}): void {
  const { logger, host, port, protocolLabel, on } = params;
  on('error', (err) => {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'EADDRINUSE') {
      const msg = `Port already in use: ${host}:${port}. Stop the other process or change transport.port in config.`;
      process.stderr.write(`${msg}\n`);
      void logger.error(`network listen failed code=EADDRINUSE host=${host} port=${port}`);
    } else {
      void logger.error(`${protocolLabel} server listen error`, err);
    }
  });
}
