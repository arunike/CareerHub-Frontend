import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface Stat {
  label: string;
  value: ReactNode;
  hint?: string;
  to?: string;
  tone?: 'neutral' | 'good' | 'warn';
}

const VALUE_TONE: Record<string, string> = {
  neutral: 'text-slate-900 dark:text-ink-50',
  good: 'text-emerald-600 dark:text-emerald-300',
  warn: 'text-amber-600 dark:text-amber-300',
};

const HAIRLINE = 'border-slate-100 dark:border-white/[0.07]';

// Explicit per-cell borders: mixing `divide-x` with a 2-up grid drew one seam and skipped the rest.
const seams = (index: number) =>
  [
    index % 2 === 0 ? 'border-r' : '',
    index < 2 ? 'border-b' : '',
    'sm:border-b-0',
    index > 0 ? 'sm:border-r-0 sm:border-l' : 'sm:border-r-0',
  ].join(' ');

// One card split by hairlines rather than four floating boxes, so the numbers read as a set.
const StatStrip = ({ stats, caption }: { stats: Stat[]; caption?: string }) => (
  <div>
    {caption && (
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
        {caption}
      </p>
    )}
    <div className="enterprise-card grid grid-cols-2 overflow-hidden sm:grid-cols-4">
      {stats.map((stat, index) => {
        const body = (
          <>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
              {stat.label}
            </p>
            <p
              className={`mt-1.5 text-[26px] font-semibold leading-none tabular-nums tracking-[-0.02em] ${
                VALUE_TONE[stat.tone ?? 'neutral']
              }`}
            >
              {stat.value}
            </p>
            <p className="mt-1.5 truncate text-[11px] text-slate-400 dark:text-ink-500">
              {stat.hint ?? ' '}
            </p>
          </>
        );
        const cell = `px-4 py-4 sm:px-5 ${HAIRLINE} ${seams(index)}`;
        return stat.to ? (
          <Link
            key={stat.label}
            to={stat.to}
            className={`${cell} transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]`}
          >
            {body}
          </Link>
        ) : (
          <div key={stat.label} className={cell}>
            {body}
          </div>
        );
      })}
    </div>
  </div>
);

export default StatStrip;
