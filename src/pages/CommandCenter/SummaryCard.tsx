import { useState } from 'react';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface SummaryRow {
  id: string;
  to: string;
  title: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
}

const TONE_RING: Record<string, string> = {
  neutral: 'bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-ink-200',
  urgent: 'bg-rose-50 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300',
};

// Every row is a link: the point of the page is to get you into the record, not to read a list.
const SummaryCard = ({
  title,
  icon: Icon,
  count,
  rows,
  seeAll,
  tone = 'neutral',
  footnote,
  collapsible = false,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  count?: number;
  rows: SummaryRow[];
  seeAll?: { to: string; label: string };
  tone?: 'neutral' | 'urgent';
  footnote?: ReactNode;
  collapsible?: boolean;
}) => {
  // Open on load: a card you have to expand to read is not a summary.
  const [open, setOpen] = useState(true);
  const collapsed = collapsible && !open;

  return (
    <section className="enterprise-card flex min-w-0 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-white/[0.07]">
        <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-ink-50">
          {Icon && <Icon className="text-[13px] text-slate-400 dark:text-ink-500" />}
          <span className="truncate">{title}</span>
        </h2>
        {count !== undefined && count > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${TONE_RING[tone]}`}
          >
            {count}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {seeAll && (
            <Link
              to={seeAll.to}
              // A 16px-tall link is not a target; the padding gives it a tappable box.
              className="-mr-1.5 inline-flex min-h-9 items-center rounded-lg px-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 hover:underline dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              {seeAll.label}
            </Link>
          )}
          {collapsible && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
              onClick={() => setOpen((current) => !current)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-ink-500 dark:hover:bg-white/[0.06]"
            >
              <DownOutlined
                className={`text-[11px] transition-transform ${collapsed ? '-rotate-90' : ''}`}
              />
            </button>
          )}
        </span>
      </header>

      {!collapsed && (
        <ul className="divide-y divide-slate-100/80 dark:divide-white/[0.05]">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={row.to}
                className="group flex min-h-11 items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
              >
                {row.leading}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-ink-100">
                    {row.title}
                  </span>
                  {row.meta && (
                    <span className="mt-0.5 block truncate text-[11.5px] text-slate-500 dark:text-ink-400">
                      {row.meta}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  {row.trailing}
                  <RightOutlined className="text-[10px] text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-ink-600" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!collapsed && footnote && (
        <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400 dark:border-white/[0.07] dark:text-ink-500">
          {footnote}
        </p>
      )}
    </section>
  );
};

export default SummaryCard;
