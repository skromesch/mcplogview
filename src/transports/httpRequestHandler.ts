import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ServerLogger } from '../logs/serverLogger.js';
import {
  handleRequestFailure,
  normalizeInitializedNotificationParams,
  parseJsonBody,
  readRequestBody,
  trimBody
} from './httpHelpers.js';

export function createHttpRequestHandler(input: {
  getTransport: () => StreamableHTTPServerTransport;
  logger: ServerLogger;
  path: string;
  debug: boolean;
  maxBodyChars: number;
  beforeParsedRequest?: (context: {
    req: Parameters<StreamableHTTPServerTransport['handleRequest']>[0];
    parsedBody: unknown;
  }) => Promise<void> | void;
}) {
  const { getTransport, logger, path, debug, maxBodyChars, beforeParsedRequest } = input;

  return (
    req: Parameters<StreamableHTTPServerTransport['handleRequest']>[0],
    res: Parameters<StreamableHTTPServerTransport['handleRequest']>[1]
  ) => {
    const method = (req.method ?? 'GET').toUpperCase();

    res.on('finish', () => {
      if (!debug) return;
      void logger.info(`http response status=${res.statusCode}`);
      if (res.statusCode >= 500) {
        void logger.error(`http response >=500 method=${method} url=${req.url ?? ''} status=${res.statusCode}`);
      }
    });

    void logger.info(`http request method=${req.method ?? 'UNKNOWN'} url=${req.url ?? ''}`);
    if (debug) {
      void logger.info(`http request headers=${JSON.stringify(req.headers)}`);
    }
    if (!req.url) {
      res.statusCode = 400;
      res.end('Missing URL');
      void logger.error('http request missing URL');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname !== path) {
      res.statusCode = 404;
      res.end('Not Found');
      void logger.error(`http request wrong path expected=${path} got=${url.pathname}`);
      return;
    }

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', String(req.headers.origin ?? '*'));
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        String(req.headers['access-control-request-headers'] ?? 'content-type,accept,mcp-session-id,mcp-protocol-version')
      );
      res.setHeader('Access-Control-Max-Age', '600');
      res.end();
      return;
    }

    if (method === 'GET') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      void (async () => {
        try {
          const raw = await readRequestBody(req);
          const bodyText = raw.toString('utf8');
          if (debug) {
            void logger.info(`http request body=${trimBody(bodyText, maxBodyChars)}`);
          }

          const parsedBody = await parseJsonBody(bodyText, logger);
          if (beforeParsedRequest) {
            await beforeParsedRequest({ req, parsedBody });
          }
          normalizeInitializedNotificationParams(parsedBody, logger, debug);
          await getTransport().handleRequest(req, res, parsedBody);
        } catch (err) {
          await handleRequestFailure({ logger, path: url.pathname, res, err });
        }
      })();
      return;
    }

    void getTransport()
      .handleRequest(req, res)
      .catch(async (err) => {
        await handleRequestFailure({ logger, path: url.pathname, res, err });
      });
  };
}
