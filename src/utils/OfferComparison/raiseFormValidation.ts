import type { RaiseEntry } from '../../types';

export type RaiseFormDraft = Omit<RaiseEntry, 'id'>;

// What the entry cannot be saved without, named the way the field is labelled in the form.
export const raiseFormIssues = (form: RaiseFormDraft): string[] => {
  const issues: string[] = [];
  if (!String(form.type ?? '').trim()) issues.push('Type');
  if (!String(form.date ?? '').trim()) issues.push('Notified on');
  if (!String(form.effective_date ?? '').trim()) issues.push('Effective date');
  return issues;
};

export const isRaiseFormComplete = (form: RaiseFormDraft): boolean =>
  raiseFormIssues(form).length === 0;

// Reads as a sentence in a tooltip: "Fill in Type and Effective date to add this raise".
export const describeRaiseFormIssues = (issues: string[]): string => {
  if (issues.length === 0) return '';
  const list =
    issues.length === 1
      ? issues[0]
      : `${issues.slice(0, -1).join(', ')} and ${issues[issues.length - 1]}`;
  return `Fill in ${list} to save this raise`;
};
