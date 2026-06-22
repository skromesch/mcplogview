import { describe, expect, it } from 'vitest';
import { createBuiltinSelfSkill } from '../../src/skills/builtinSelfSkill.js';

describe('builtin self skill', () => {
  it('returns builtin payload for mcplogview-self', () => {
    const skill = createBuiltinSelfSkill();

    expect(skill.sourceId).toBe('mcplogview-self');
    expect(skill.origin).toBe('builtin');
    expect(skill.structured.sourceId).toBe('mcplogview-self');
    expect(skill.renderedMarkdown).toContain('self-log debugging');
  });
});
