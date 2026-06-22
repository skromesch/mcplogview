import { z } from 'zod';

const frontmatterSchema = z.object({
  name: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  version: z.number().int().min(1).default(1),
  hint: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([])
});

export interface ParsedSkillMarkdown {
  meta: z.infer<typeof frontmatterSchema>;
  body: string;
  warnings: string[];
}

function parseScalar(value: string): string | number {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseTags(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((x) => x.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''))
      .filter(Boolean);
  }
  return [trimmed].filter(Boolean);
}

export function parseSkillMarkdown(raw: string): ParsedSkillMarkdown {
  const warnings: string[] = [];
  if (!raw.startsWith('---\n')) {
    warnings.push('missing front matter header; using defaults');
    return {
      meta: frontmatterSchema.parse({}),
      body: raw,
      warnings
    };
  }

  const end = raw.indexOf('\n---\n', 4);
  if (end < 0) {
    warnings.push('invalid front matter delimiter; using defaults');
    return {
      meta: frontmatterSchema.parse({}),
      body: raw,
      warnings
    };
  }

  const header = raw.slice(4, end).split('\n');
  const body = raw.slice(end + 5);
  const data: Record<string, unknown> = {};

  for (const line of header) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf(':');
    if (sep < 0) {
      warnings.push(`ignored malformed front matter line: ${trimmed}`);
      continue;
    }
    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim();
    if (key === 'tags') {
      data[key] = parseTags(value);
    } else {
      data[key] = parseScalar(value);
    }
  }

  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    warnings.push('invalid front matter values; using defaults');
    return {
      meta: frontmatterSchema.parse({}),
      body,
      warnings
    };
  }

  return { meta: parsed.data, body, warnings };
}
