import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveHttpsOptions } from '../../src/transports/httpsKeyHandler.js';

const testDir = join(tmpdir(), 'mcplogview-https-test-' + Date.now());

function ensureTestDir() {
  try {
    mkdirSync(testDir, { recursive: true });
  } catch {
    // ignore if exists
  }
}

function writeKeyFile(content: string) {
  ensureTestDir();
  const path = join(testDir, 'test-key.pem');
  writeFileSync(path, content);
  return path;
}

function writeCertFile(content: string) {
  ensureTestDir();
  const path = join(testDir, 'test-cert.pem');
  writeFileSync(path, content);
  return path;
}

describe('resolveHttpsOptions', () => {
  beforeEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('generates self-signed cert when no file paths provided', () => {
    const result = resolveHttpsOptions({ logger: { info: async () => {}, error: async () => {} } as never });

    expect(result).toBeDefined();
    expect(typeof result.key).toBe('string');
    expect(typeof result.cert).toBe('string');
    expect(result.key).toContain('PRIVATE KEY');
    expect(result.cert).toContain('CERTIFICATE');
  });

  it('generates valid self-signed cert with localhost CN', () => {
    const result = resolveHttpsOptions({ logger: { info: async () => {}, error: async () => {} } as never });

    expect(result.key).toContain('BEGIN PRIVATE KEY');
    expect(result.cert).toContain('BEGIN CERTIFICATE');
  });

  it('loads key/cert from files when paths provided', () => {
    const keyPath = writeKeyFile('-----BEGIN PRIVATE KEY-----\nTESTKEYDATA\n-----END PRIVATE KEY-----');
    const certPath = writeCertFile('-----BEGIN CERTIFICATE-----\nTESTCERTDATA\n-----END CERTIFICATE-----');

    const result = resolveHttpsOptions({
      httpsKey: keyPath,
      httpsCert: certPath,
      logger: { info: async () => {}, error: async () => {} } as never
    });

    expect(result.key).toContain('TESTKEYDATA');
    expect(result.cert).toContain('TESTCERTDATA');
  });

  it('falls back to self-signed when file loading fails', () => {
    const result = resolveHttpsOptions({
      httpsKey: '/nonexistent/path/key.pem',
      httpsCert: '/nonexistent/path/cert.pem',
      logger: { info: async () => {}, error: async () => {} } as never
    });

    expect(result.key).toContain('PRIVATE KEY');
    expect(result.cert).toContain('CERTIFICATE');
  });

  it('falls back to self-signed when key file is invalid', () => {
    const keyPath = writeKeyFile('this is not a valid key');
    const certPath = writeCertFile('-----BEGIN CERTIFICATE-----\nTESTCERTDATA\n-----END CERTIFICATE-----');

    const result = resolveHttpsOptions({
      httpsKey: keyPath,
      httpsCert: certPath,
      logger: { info: async () => {}, error: async () => {} } as never
    });

    expect(result.key).toContain('PRIVATE KEY');
  });

  it('falls back to self-signed when cert file is invalid', () => {
    const keyPath = writeKeyFile('-----BEGIN PRIVATE KEY-----\nTESTKEYDATA\n-----END PRIVATE KEY-----');
    const certPath = writeCertFile('this is not a valid cert');

    const result = resolveHttpsOptions({
      httpsKey: keyPath,
      httpsCert: certPath,
      logger: { info: async () => {}, error: async () => {} } as never
    });

    expect(result.cert).toContain('CERTIFICATE');
  });
});
