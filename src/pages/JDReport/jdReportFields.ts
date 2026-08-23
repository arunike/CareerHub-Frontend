export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const supportLabel = (value: unknown) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const skillName = (value: unknown) =>
  isRecord(value) ? String(value.skill || '') : String(value || '');
export const missingSkillName = (value: unknown) =>
  isRecord(value) ? String(value.skill || '') : String(value || '');
export const keywordName = (value: unknown) =>
  isRecord(value) ? String(value.keyword || '') : String(value || '');
export const requirementName = (value: unknown) =>
  isRecord(value) ? String(value.requirement || '') : String(value || '');
