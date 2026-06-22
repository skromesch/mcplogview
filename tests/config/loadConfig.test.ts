import { describe, it, expect } from 'vitest';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/config/loadConfig.js';

describe('loadConfig', () => {
  it('loads valid config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const path = join(dir, 'log-sources.json');
    await writeFile(path, JSON.stringify({
      sources: [{ type: 'local', id: 'api', label: 'API Log', path: '/tmp/api.log' }]
    }), 'utf8');

    const cfg = await loadConfig(path);
    expect(cfg.sources.some((s) => s.id === 'api')).toBe(true);
    expect(cfg.sources.some((s) => s.id === 'mcplogview-self')).toBe(true);
    expect(cfg.skillsDir.endsWith('/config/log-skills')).toBe(true);
  });

  it('throws on duplicate source ids', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const path = join(dir, 'log-sources.json');
    await writeFile(path, JSON.stringify({
      sources: [
        { type: 'local', id: 'api', label: 'A', path: '/tmp/a.log' },
        { type: 'local', id: 'api', label: 'B', path: '/tmp/b.log' }
      ]
    }), 'utf8');

    await expect(loadConfig(path)).rejects.toThrow(/duplicate/i);
  });

  it('applies default transport when not configured', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const path = join(dir, 'log-sources.json');
    await writeFile(path, JSON.stringify({
      sources: [{ type: 'local', id: 'api', label: 'API Log', path: '/tmp/api.log' }]
    }), 'utf8');

    const cfg = await loadConfig(path);
    expect(cfg.transport.mode).toBe('stdio');
    expect(cfg.transport.port).toBe(3333);
    expect(cfg.transport.path).toBe('/mcp');
    expect(cfg.logging.enabled).toBe(true);
  });

  it('loads ssh source with identity file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const path = join(dir, 'log-sources.json');
    await writeFile(path, JSON.stringify({
      sources: [{
        type: 'ssh',
        id: 'prod',
        label: 'Prod',
        host: 'example.com',
        user: 'ubuntu',
        identityFile: '/tmp/id_ed25519',
        path: '/var/log/app.log'
      }]
    }), 'utf8');

    const cfg = await loadConfig(path);
    expect(cfg.sources.some((s) => s.type === 'ssh')).toBe(true);
  });

  it('does not inject self source when logging disabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-'));
    const path = join(dir, 'log-sources.json');
    await writeFile(path, JSON.stringify({
      logging: { enabled: false },
      sources: [{ type: 'local', id: 'api', label: 'API Log', path: '/tmp/api.log' }]
    }), 'utf8');

    const cfg = await loadConfig(path);
    expect(cfg.sources.some((s) => s.id === 'mcplogview-self')).toBe(false);
  });
});
