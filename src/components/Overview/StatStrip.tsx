import { useState } from 'react';
import { Drawer, Popover } from 'antd';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useIsMobile } from '../../hooks/useIsMobile';

export interface Stat {
  label: string;
  value: ReactNode;
  hint?: string;
  to?: string;
  tone?: 'neutral' | 'good' | 'warn';
  // A cell that opens its detail in place, for a list that does not deserve a section of its own.
  panel?: { title: string; content: ReactNode };
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

// A bottom sheet on a phone and a popover on a desktop, the same split every disclosure here uses.
const StatPanelCell = ({
  panel,
  className,
  children,
}: {
  panel: { title: string; content: ReactNode };
  className: string;
  children: ReactNode;
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // Popover supplies its own onClick; passing one as well made each click toggle twice.
  const trigger = (onClick?: () => void) => (
    <button type="button" className={className} aria-expanded={open} onClick={onClick}>
      {children}
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger(() => setOpen(true))}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          placement="bottom"
          height="auto"
          title={panel.title}
        >
          {panel.content}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      title={panel.title}
      content={panel.content}
    >
      {trigger()}
    </Popover>
  );
};

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
        const hover = 'transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]';
        if (stat.panel) {
          return (
            <StatPanelCell
              key={stat.label}
              className={`${cell} ${hover} text-left`}
              panel={stat.panel}
            >
              {body}
            </StatPanelCell>
          );
        }
        return stat.to ? (
          <Link key={stat.label} to={stat.to} className={`${cell} ${hover}`}>
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
