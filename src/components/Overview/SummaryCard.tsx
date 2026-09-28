import { useState } from 'react';
import { DownOutlined } from '@ant-design/icons';
import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import SummaryRowList from './SummaryRowList';
import type { SummaryRow } from './SummaryRowList';

// Re-exported so the many call sites that type their rows keep one import.
export type { SummaryRow };

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
  defaultOpen = true,
  previewCount,
  moreLabel,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  count?: number;
  rows: SummaryRow[];
  seeAll?: { to: string; label: string };
  tone?: 'neutral' | 'urgent';
  footnote?: ReactNode;
  collapsible?: boolean;
  // Closed on load for a pile that is a decision rather than today's work.
  defaultOpen?: boolean;
  // Rows past this are hidden behind a button that reveals them here, rather than a dead count.
  previewCount?: number;
  moreLabel?: (hidden: number) => string;
}) => {
  // Open on load: a card you have to expand to read is not a summary.
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const collapsed = collapsible && !open;
  const hidden = previewCount === undefined ? 0 : Math.max(0, rows.length - previewCount);
  const visible = previewCount === undefined || showAll ? rows : rows.slice(0, previewCount);

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

      {!collapsed && <SummaryRowList rows={visible} />}

      {!collapsed && hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          className="flex min-h-11 w-full items-center gap-1.5 border-t border-slate-100 px-5 text-left text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-50/60 dark:border-white/[0.07] dark:text-blue-300 dark:hover:bg-blue-500/10"
        >
          {showAll ? 'Show less' : (moreLabel?.(hidden) ?? `Show ${hidden} more`)}
          <DownOutlined
            className={`text-[9px] transition-transform ${showAll ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Shown while collapsed too: on a closed card the footnote is the only fact left visible. */}
      {footnote && (
        <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400 dark:border-white/[0.07] dark:text-ink-500">
          {footnote}
        </p>
      )}
    </section>
  );
};

export default SummaryCard;
