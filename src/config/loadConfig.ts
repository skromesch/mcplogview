import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { appConfigSchema, type AppConfig } from './schema.js';
import { DuplicateSourceIdError } from '../errors.js';

export async function loadConfig(configPath: string): Promise<AppConfig> {
  const raw = await readFile(configPath, 'utf8');
  const parsed = appConfigSchema.parse(JSON.parse(raw));
  parsed.logging.path = resolve(parsed.logging.path);
  parsed.skillsDir = resolve(parsed.skillsDir);

  if (parsed.logging.enabled) {
    const sourceExists = parsed.sources.some((source) => source.id === parsed.logging.selfSourceId);

    if (!sourceExists) {
      parsed.sources.unshift({
        type: 'local',
        id: parsed.logging.selfSourceId,
        label: parsed.logging.selfSourceLabel,
        description: 'Internal mcplogview server log',
        path: parsed.logging.path
      });
    }
  }

  const ids = new Set<string>();
  for (const source of parsed.sources) {
    if (ids.has(source.id)) {
      throw new DuplicateSourceIdError(source.id);
    }
    ids.add(source.id);
  }

  return parsed;
}
