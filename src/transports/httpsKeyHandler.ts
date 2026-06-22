import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { ServerLogger } from '../logs/serverLogger.js';

export interface HttpsOptions {
  key: string;
  cert: string;
}

function generateSelfSigned(): HttpsOptions {
  const tempDir = join('/tmp', `mcplogview-https-${randomUUID()}`);
  const keyPath = join(tempDir, 'key.pem');
  const certPath = join(tempDir, 'cert.pem');

  try {
    mkdirSync(tempDir, { recursive: true });

    execSync(
      `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj /CN=localhost 2>/dev/null`,
      { stdio: 'ignore' }
    );

    const keyPem = readFileSync(keyPath, 'utf8');
    const certPem = readFileSync(certPath, 'utf8');

    return { key: keyPem, cert: certPem };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`failed to generate self-signed certificate using openssl: ${message}`);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

export function resolveHttpsOptions(input: {
  httpsKey?: string;
  httpsCert?: string;
  logger: ServerLogger;
}): HttpsOptions {
  const { httpsKey, httpsCert, logger } = input;

  if (httpsKey && httpsCert) {
    try {
      const resolvedKeyPath = resolve(httpsKey);
      const resolvedCertPath = resolve(httpsCert);

      const keyPem = readFileSync(resolvedKeyPath, 'utf8');
      const certPem = readFileSync(resolvedCertPath, 'utf8');

      if (!keyPem.includes('PRIVATE KEY') && !keyPem.includes('RSA PRIVATE KEY')) {
        void logger.error(`https key file does not appear to contain a private key: ${resolvedKeyPath}`);
        return generateSelfSigned();
      }

      if (!certPem.includes('CERTIFICATE')) {
        void logger.error(`https cert file does not appear to contain a certificate: ${resolvedCertPath}`);
        return generateSelfSigned();
      }

      return { key: keyPem, cert: certPem };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      void logger.error(`failed to load https key/cert from files, generating self-signed: ${message}`);
      return generateSelfSigned();
    }
  }

  return generateSelfSigned();
}
