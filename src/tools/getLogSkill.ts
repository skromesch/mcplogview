import { z } from 'zod';
import type { AppConfig } from '../config/schema.js';
import { UnknownSourceError } from '../errors.js';
import type { LogRegistry } from '../logs/logRegistry.js';
import { createBuiltinSelfSkill } from '../skills/builtinSelfSkill.js';
import { loadSkillFromFile } from '../skills/skillLoader.js';

const inputSchema = z.object({
  sourceId: z.string().min(1)
});

export type GetLogSkillToolInput = z.infer<typeof inputSchema>;

export async function getLogSkillHandler(registry: LogRegistry, config: AppConfig, input: GetLogSkillToolInput) {
  const args = inputSchema.parse(input);
  const source = registry.get(args.sourceId);

  if (!source) {
    throw new UnknownSourceError(args.sourceId);
  }

  if (source.id === 'mcplogview-self') {
    return createBuiltinSelfSkill();
  }

  return loadSkillFromFile({
    source,
    skillsDir: config.skillsDir
  });
}
