// One size, radius and weight for every status label; pay is the card's only accent.
export const LEVEL_BADGE_CLASS =
  'inline-flex shrink-0 items-center rounded-md border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.04] px-1.5 py-[1px] text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-ink-400 tabular-nums';

// The `before` box is the 44px touch target, so the row's height does not change to hold one.
export const LEVEL_LINK_CLASS = `${LEVEL_BADGE_CLASS} relative gap-1 transition-colors hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-[calc(100%+1rem)] before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] lg:before:hidden`;

export const STATUS_BADGE_CLASS =
  'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-[1px] text-[11px] font-semibold tracking-[0.01em]';
