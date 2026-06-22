import { describe, expect, it } from 'vitest';
import { parseSkillMarkdown } from '../../src/skills/skillParser.js';

describe('skill parser', () => {
  it('parses front matter and markdown body', () => {
    const parsed = parseSkillMarkdown([
      '---',
      'name: app-skill',
      'sourceId: app',
      'version: 2',
      'hint: Read app errors first',
      'tags: [api, errors]',
      '---',
      '# App skill',
      'Body'
    ].join('\n'));

    expect(parsed.meta.name).toBe('app-skill');
    expect(parsed.meta.sourceId).toBe('app');
    expect(parsed.meta.version).toBe(2);
    expect(parsed.meta.tags).toEqual(['api', 'errors']);
    expect(parsed.body).toContain('# App skill');
  });

  it('falls back when front matter is missing', () => {
    const parsed = parseSkillMarkdown('# no front matter');
    expect(parsed.meta.version).toBe(1);
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });
});
