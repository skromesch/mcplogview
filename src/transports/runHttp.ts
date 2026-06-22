import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { randomUUID } from 'node:crypto';
import type { ServerLogger } from '../logs/serverLogger.js';
import { attachListenErrorHandler } from './httpHelpers.js';
import { createHttpRequestHandler } from './httpRequestHandler.js';
import { resolveHttpsOptions } from './httpsKeyHandler.js';

export async function runHttpTransport(input: {
  server: McpServer;
  logger: ServerLogger;
  transportMode: 'http' | 'https-dev';
  host: string;
  port: number;
  path: string;
  debug: boolean;
  maxBodyChars: number;
}): Promise<{ close: () => Promise<void> }> {
  const { server, logger, transportMode, host, port, path, debug, maxBodyChars } = input;

  let transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true
  });
  transport.onerror = (err) => {
    void logger.error('streamable-http transport error', err);
  };
  await server.connect(transport);

  const requestHandler = createHttpRequestHandler({
    getTransport: () => transport,
    logger,
    path,
    debug,
    maxBodyChars,
    beforeParsedRequest: async ({ req, parsedBody }) => {
      const method =
        parsedBody &&
        typeof parsedBody === 'object' &&
        'method' in parsedBody &&
        typeof (parsedBody as { method?: unknown }).method === 'string'
          ? (parsedBody as { method: string }).method
          : '';
      const hasSessionHeader = Boolean(req.headers['mcp-session-id']);
      if (method !== 'initialize' || hasSessionHeader || !transport.sessionId) {
        return;
      }

      await transport.close();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true
      });
      transport.onerror = (err) => {
        void logger.error('streamable-http transport error', err);
      };
      await server.connect(transport);
      await logger.info('streamable-http transport rotated for new initialize request');
    }
  });

  let httpServer: ReturnType<typeof createServer>;

  if (transportMode === 'https-dev') {
    const httpsServer = createSecureServer(resolveHttpsOptions({ logger }), requestHandler);
    attachListenErrorHandler({ logger, host, port, protocolLabel: 'https', on: httpsServer.on.bind(httpsServer) });
    httpsServer.listen(port, host, () => {
      const msg = `MCP Streamable HTTP(S) listening on https://${host}:${port}${path}`;
      process.stderr.write(`${msg}\n`);
      void logger.info(msg);
    });
    httpServer = httpsServer;
  } else {
    const httpServerLocal = createServer(requestHandler);
    attachListenErrorHandler({ logger, host, port, protocolLabel: 'http', on: httpServerLocal.on.bind(httpServerLocal) });
    httpServerLocal.listen(port, host, () => {
      const msg = `MCP Streamable HTTP listening on http://${host}:${port}${path}`;
      process.stderr.write(`${msg}\n`);
      void logger.info(msg);
    });
    httpServer = httpServerLocal;
  }

  return { close: () => { httpServer.close(); return Promise.resolve(); } };
}
