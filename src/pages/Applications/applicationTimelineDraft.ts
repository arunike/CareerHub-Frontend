export type TimelineDraft = {
  id?: number;
  title: string;
  stage_order?: number;
  event_date?: string | null;
  notes: string;
};

export type DisplayStage = {
  key: string;
  label: string;
  shortLabel?: string;
  tone?: string;
};

export const emptyDraft = (): TimelineDraft => ({
  title: '',
  event_date: null,
  notes: '',
});

export const hasContent = (draft?: TimelineDraft) =>
  Boolean(draft?.id || draft?.event_date || draft?.notes.trim());

export const formatStageLabel = (key: string) => {
  if (!key) return 'Stage';
  if (key.includes(' ')) return key;
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

export const getStageState = (draft: TimelineDraft, isCurrent: boolean) => {
  if (isCurrent) return 'current';
  if (draft.event_date || draft.notes.trim()) return 'done';
  return 'empty';
};
