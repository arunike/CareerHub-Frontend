// Mirrors CareerHubThemeProvider: height 38, radius 9, border #e2e8f0, primary #2563eb.
export const CONTROL_CLASS =
  'h-[38px] w-full rounded-[9px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-sm text-slate-800 dark:text-ink-50 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

// Fixed height so sibling columns line up when only some carry a toggle.
export const FIELD_HEADER_CLASS = 'mb-1.5 flex h-5 items-center justify-between gap-2';

export const FIELD_LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-ink-400';

// Hint line under a control. Fixed height keeps the bottom edge of each column even.
export const FIELD_HINT_CLASS = 'mt-1 flex h-5 items-center justify-between gap-2 text-[11px]';

// The sentence-case label above a control, as against the uppercase FIELD_LABEL_CLASS.
export const FORM_LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1';

// The small uppercase heading over a group of rows.
export const SECTION_LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-ink-500';
