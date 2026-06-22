import { describe, it, expect } from 'vitest';
import { createHttpRequestHandler } from '../../src/transports/httpRequestHandler.js';

function createReq(method: string, url: string, headers: Record<string, string>, body: string) {
  return {
    method,
    url,
    headers,
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(body, 'utf8');
    }
  } as unknown as Parameters<ReturnType<typeof createHttpRequestHandler>>[0];
}

function createRes() {
  let finishedHandler: (() => void) | undefined;
  const res: {
    statusCode: number;
    headersSent: boolean;
    on: (event: string, handler: () => void) => unknown;
    end: () => unknown;
  } = {
    statusCode: 200,
    headersSent: false,
    on(event: string, handler: () => void) {
      if (event === 'finish') finishedHandler = handler;
      return this;
    },
    end() {
      this.headersSent = true;
      finishedHandler?.();
      return this;
    }
  };

  return res as unknown as Parameters<ReturnType<typeof createHttpRequestHandler>>[1];
}

describe('http request handler transport selection', () => {
  it('can rotate transport before a repeated initialize request', async () => {
    const logger = { info: async () => {}, error: async () => {} };
    const calls: string[] = [];

    const t1 = {
      sessionId: undefined as string | undefined,
      async handleRequest(_req: unknown, res: { end: () => void }) {
        calls.push('t1');
        this.sessionId = 'session-1';
        res.end();
      }
    };

    const t2 = {
      sessionId: undefined as string | undefined,
      async handleRequest(_req: unknown, res: { end: () => void }) {
        calls.push('t2');
        this.sessionId = 'session-2';
        res.end();
      }
    };

    let current = t1;
    const handler = createHttpRequestHandler({
      getTransport: () => current as never,
      logger: logger as never,
      path: '/mcp',
      debug: false,
      maxBodyChars: 1024,
      beforeParsedRequest: async ({ parsedBody }) => {
        const method =
          parsedBody && typeof parsedBody === 'object' && 'method' in parsedBody
            ? String((parsedBody as { method?: unknown }).method ?? '')
            : '';
        if (method === 'initialize' && current.sessionId) {
          current = t2;
        }
      }
    });

    const initBody =
      '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}';

    const req1 = createReq('POST', '/mcp', { host: '127.0.0.1:3333', accept: 'application/json' }, initBody);
    const res1 = createRes();
    handler(req1, res1);
    await new Promise((r) => setTimeout(r, 0));

    const req2 = createReq('POST', '/mcp', { host: '127.0.0.1:3333', accept: 'application/json' }, initBody);
    const res2 = createRes();
    handler(req2, res2);
    await new Promise((r) => setTimeout(r, 0));

    expect(calls).toEqual(['t1', 't2']);
  });
});
