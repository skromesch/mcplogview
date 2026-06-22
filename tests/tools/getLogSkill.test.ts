import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appConfigSchema } from '../../src/config/schema.js';
import { createLogRegistry } from '../../src/logs/logRegistry.js';
import { getLogSkillHandler } from '../../src/tools/getLogSkill.js';

describe('get_log_skill tool', () => {
  const baseConfig = appConfigSchema.parse({
    logging: {
      enabled: true,
      debug: false,
      maxBodyChars: 4000,
      path: '/tmp/mcplogview-self.log',
      selfSourceId: 'mcplogview-self',
      selfSourceLabel: 'Self'
    },
    transport: {
      mode: 'stdio',
      host: '127.0.0.1',
      port: 3333,
      path: '/mcp'
    },
    sources: []
  });

  it('returns builtin skill for self source', async () => {
    const registry = createLogRegistry({
      sources: [{ type: 'local', id: 'mcplogview-self', label: 'Self', path: '/tmp/self.log' }]
    });

    const result = await getLogSkillHandler(registry, { ...baseConfig, skillsDir: '/tmp' }, { sourceId: 'mcplogview-self' });
    expect(result.origin).toBe('builtin');
  });

  it('returns file-based skill when file exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-skill-'));
    const skillsDir = join(dir, 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'app.md'), ['---', 'name: app-skill', 'sourceId: app', 'version: 1', '---', '# App skill'].join('\n'));

    const registry = createLogRegistry({
      sources: [{ type: 'local', id: 'app', label: 'App', path: '/tmp/app.log' }]
    });

    const result = await getLogSkillHandler(registry, { ...baseConfig, skillsDir }, { sourceId: 'app' });
    expect(result.origin).toBe('file');
    expect(result.renderedMarkdown).toContain('# App skill');
  });

  it('falls back and warns on sourceId mismatch', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcplogview-skill-'));
    const skillsDir = join(dir, 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'app.md'), ['---', 'sourceId: worker', '---', '# Wrong source'].join('\n'));

    const registry = createLogRegistry({
      sources: [{ type: 'local', id: 'app', label: 'App', path: '/tmp/app.log' }]
    });

    const result = await getLogSkillHandler(registry, { ...baseConfig, skillsDir }, { sourceId: 'app' });
    expect(result.origin).toBe('fallback');
    expect(result.warnings.some((x) => x.includes('mismatch'))).toBe(true);
  });
});
