import { describe, it, expect } from 'vitest';
import { createRuntimeContext, resolveConfigPath } from '../../src/runtime/bootstrap.js';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('runtime bootstrap', () => {
  it('uses default config path when env is not set', async () => {
    const original = process.env.LOG_SOURCES_CONFIG;
    delete process.env.LOG_SOURCES_CONFIG;
    const path = await resolveConfigPath();
    expect(path).toBe('config/log-sources.json');
    if (original === undefined) {
      delete process.env.LOG_SOURCES_CONFIG;
    } else {
      process.env.LOG_SOURCES_CONFIG = original;
    }
  });

  it('creates runtime context with expected tools registry', async () => {
    const runtime = await createRuntimeContext('config/log-sources.example.json');
    expect(runtime.config.sources.length).toBeGreaterThan(0);
    expect(runtime.registry.list().length).toBeGreaterThan(0);
  });

  it('creates minimal debug config when file is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-bootstrap-'));
    const configPath = join(dir, 'generated', 'log-sources.json');

    const runtime = await createRuntimeContext(configPath);
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { logging: { debug: boolean; enabled: boolean }; sources: Array<{ id: string }>; skillsDir: string };

    expect(parsed.logging.enabled).toBe(true);
    expect(parsed.logging.debug).toBe(true);
    expect(parsed.sources.length).toBe(0);
    expect(parsed.skillsDir).toBe('config/log-skills');
    expect(runtime.registry.list().length).toBeGreaterThan(0);
  });
});
