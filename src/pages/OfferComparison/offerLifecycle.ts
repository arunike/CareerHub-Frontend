import dayjs from 'dayjs';

export * from '../../utils/offerDeadline';

export type NegotiationOutcome = 'pending' | 'accepted' | 'partial' | 'rejected';

export interface NegotiationRound {
  id: string;
  date: string;
  outcome: NegotiationOutcome;
  askedBase?: number | null;
  askedBonus?: number | null;
  askedEquity?: number | null;
  askedSignOn?: number | null;
  receivedBase?: number | null;
  receivedBonus?: number | null;
  receivedEquity?: number | null;
  receivedSignOn?: number | null;
  notes?: string;
}

export const NEGOTIATION_OUTCOME_LABELS: Record<NegotiationOutcome, string> = {
  pending: 'Awaiting response',
  accepted: 'Accepted in full',
  partial: 'Partially met',
  rejected: 'Declined',
};

export const NEGOTIATION_OUTCOME_CLASSES: Record<NegotiationOutcome, string> = {
  pending:
    'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 text-slate-600 dark:text-ink-200',
  accepted:
    'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  partial:
    'border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rejected:
    'border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const NEGOTIATION_COMPONENTS = [
  { key: 'Base', asked: 'askedBase', received: 'receivedBase' },
  { key: 'Bonus', asked: 'askedBonus', received: 'receivedBonus' },
  { key: 'Equity', asked: 'askedEquity', received: 'receivedEquity' },
  { key: 'Sign-on', asked: 'askedSignOn', received: 'receivedSignOn' },
] as const;

export interface NegotiationLineItem {
  label: string;
  asked: number | null;
  received: number | null;
  // The difference between received and asked, only when both sides were recorded.
  gap: number | null;
}

export const getNegotiationLineItems = (round: NegotiationRound): NegotiationLineItem[] =>
  NEGOTIATION_COMPONENTS.map(({ key, asked, received }) => {
    const askedValue = round[asked] ?? null;
    const receivedValue = round[received] ?? null;
    return {
      label: key,
      asked: askedValue,
      received: receivedValue,
      gap: askedValue != null && receivedValue != null ? receivedValue - askedValue : null,
    };
  }).filter((item) => item.asked != null || item.received != null);

export const normalizeNegotiationRounds = (value: unknown): NegotiationRound[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is NegotiationRound =>
      !!entry && typeof entry === 'object' && typeof (entry as NegotiationRound).id === 'string'
  );
};

export const sortNegotiationRounds = (rounds: NegotiationRound[]): NegotiationRound[] =>
  [...rounds].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

export type FinalDecisionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export const FINAL_DECISION_OPTIONS: { value: FinalDecisionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Declined by me' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'WITHDRAWN', label: 'Withdrawn by employer' },
];

export const FINAL_DECISION_CLASSES: Record<FinalDecisionStatus, string> = {
  PENDING:
    'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 text-slate-600 dark:text-ink-200',
  ACCEPTED:
    'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  REJECTED:
    'border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-ink-200',
  DECLINED:
    'border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-ink-200',
  EXPIRED:
    'border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
  WITHDRAWN:
    'border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

export const FINAL_DECISION_LABELS: Record<FinalDecisionStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined by me',
  DECLINED: 'Declined by me',
  EXPIRED: 'Expired',
  WITHDRAWN: 'Withdrawn by employer',
};

const ALL_FINAL_DECISION_STATUSES: FinalDecisionStatus[] = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'DECLINED',
  'EXPIRED',
  'WITHDRAWN',
];

export const normalizeFinalDecisionStatus = (value: unknown): FinalDecisionStatus =>
  ALL_FINAL_DECISION_STATUSES.includes(value as FinalDecisionStatus)
    ? (value as FinalDecisionStatus)
    : 'PENDING';
