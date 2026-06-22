export type SkillOrigin = 'builtin' | 'file' | 'fallback';

export interface LogSkillStructured {
  name?: string;
  sourceId: string;
  version: number;
  tags: string[];
  purpose: string;
  quickStart: string[];
  queries: string[];
  troubleshooting: string[];
}

export interface LogSkillPayload {
  sourceId: string;
  hint?: string;
  origin: SkillOrigin;
  warnings: string[];
  structured: LogSkillStructured;
  renderedMarkdown: string;
}
