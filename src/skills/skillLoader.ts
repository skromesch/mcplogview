import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LogSource } from '../config/schema.js';
import { parseSkillMarkdown } from './skillParser.js';
import type { LogSkillPayload } from './types.js';

function createFallbackSkill(source: LogSource, hint?: string, warnings: string[] = []): LogSkillPayload {
  return {
    sourceId: source.id,
    hint,
    origin: 'fallback',
    warnings,
    structured: {
      sourceId: source.id,
      version: 1,
      tags: [source.type, 'logs'],
      purpose: source.description ?? `Read and follow the ${source.label} log source.`,
      quickStart: [
        `Call read_log_chunk for ${source.id} with maxLines=100`,
        `Use follow_log for ${source.id} during reproductions`
      ],
      queries: [
        `read_log_chunk {"sourceId":"${source.id}","maxLines":100}`,
        `follow_log {"sourceId":"${source.id}","timeoutMs":5000,"pollIntervalMs":200}`
      ],
      troubleshooting: [
        'If no lines are returned, verify source path/ssh connectivity.',
        'If cursor handling is unclear, continue with returned cursor values only.'
      ]
    },
    renderedMarkdown: `# ${source.label}\n\nUse this source to inspect runtime log lines and follow new events.`
  };
}

export async function loadSkillFromFile(input: {
  source: LogSource;
  skillsDir: string;
}): Promise<LogSkillPayload> {
  const { source, skillsDir } = input;
  const path = join(skillsDir, `${source.id}.md`);

  try {
    const raw = await readFile(path, 'utf8');
    const parsed = parseSkillMarkdown(raw);

    if (parsed.meta.sourceId && parsed.meta.sourceId !== source.id) {
      return createFallbackSkill(source, parsed.meta.hint ?? source.hint, [
        ...parsed.warnings,
        `front matter sourceId mismatch: expected=${source.id} got=${parsed.meta.sourceId}`
      ]);
    }

    return {
      sourceId: source.id,
      hint: parsed.meta.hint ?? source.hint,
      origin: 'file',
      warnings: parsed.warnings,
      structured: {
        name: parsed.meta.name,
        sourceId: source.id,
        version: parsed.meta.version,
        tags: parsed.meta.tags,
        purpose: source.description ?? `Read and follow the ${source.label} log source.`,
        quickStart: [
          `Call read_log_chunk for ${source.id} with maxLines=100`,
          `Use follow_log for ${source.id} during reproductions`
        ],
        queries: [
          `read_log_chunk {"sourceId":"${source.id}","maxLines":100}`,
          `follow_log {"sourceId":"${source.id}","timeoutMs":5000,"pollIntervalMs":200}`
        ],
        troubleshooting: [
          'If no lines are returned, verify source path/ssh connectivity.',
          'If cursor handling is unclear, continue with returned cursor values only.'
        ]
      },
      renderedMarkdown: parsed.body
    };
  } catch {
    return createFallbackSkill(source, source.hint, [`skill file not found: ${path}`]);
  }
}
