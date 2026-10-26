import type { ReactNode } from 'react';
import type { TimelineMark } from '../../utils/Experience/roleTimeline';

const LINE_CLASS = 'absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full';
const LINE_TINT = 'bg-slate-300 dark:bg-ink-700';
// Reaches into the space-y-10 gap so the line never breaks between cards.
const LINE_SPAN = { top: 26, bottom: 'calc(-2.5rem - 26px)' } as const;

// Centred on the node, which sits 26px down: a 60px box around the 52px avatar.
const RING_RADIUS = 27;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// The card's height is its content, so the year a role started can only be shown at the node.
const MonthRing = ({ fraction, isCurrent }: { fraction: number; isCurrent: boolean }) => (
  <svg
    viewBox="0 0 60 60"
    className="pointer-events-none absolute left-1/2 top-[-4px] h-[60px] w-[60px] -translate-x-1/2"
    aria-hidden
  >
    <circle
      cx="30"
      cy="30"
      r={RING_RADIUS}
      fill="none"
      strokeWidth="2"
      className="stroke-slate-200 dark:stroke-ink-800"
    />
    <circle
      cx="30"
      cy="30"
      r={RING_RADIUS}
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={`${RING_LENGTH * fraction} ${RING_LENGTH}`}
      transform="rotate(-90 30 30)"
      className={
        isCurrent ? 'stroke-blue-400 dark:stroke-blue-300' : 'stroke-slate-400 dark:stroke-ink-500'
      }
    />
  </svg>
);

export const TimelineRailDesktop = ({
  avatar,
  mark,
  isFirst,
  isLast,
  isCurrent,
}: {
  avatar: ReactNode;
  mark?: TimelineMark | null;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
}) => (
  <div className="relative z-10 hidden w-[52px] shrink-0 flex-col items-center md:flex">
    {isFirst && (
      <>
        <div
          className={`${LINE_CLASS} ${isCurrent ? 'bg-gradient-to-b from-transparent to-blue-300' : 'bg-gradient-to-b from-transparent to-slate-300 dark:to-ink-700'}`}
          style={{ top: -18, height: 44 }}
        />
        {isCurrent && (
          <span
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-blue-500 dark:bg-blue-400"
            style={{ top: -20 }}
            title="Current role"
          />
        )}
      </>
    )}
    {!isLast && <div className={`${LINE_CLASS} ${LINE_TINT}`} style={LINE_SPAN} />}
    {mark && <MonthRing fraction={mark.yearFraction} isCurrent={isCurrent} />}
    <div className="relative z-10" title={mark?.title}>
      {avatar}
    </div>
    {/* Connector into the card: the 24px column gap. */}
    <div
      className="absolute left-full top-[25px] h-0.5 w-5 bg-gradient-to-r from-slate-300 dark:from-ink-700 to-transparent"
      aria-hidden
    />
    {mark && (
      <span
        className="relative z-10 mt-2 whitespace-nowrap rounded bg-white/90 dark:bg-ink-900/90 px-1 text-[11px] font-semibold tabular-nums text-slate-400 dark:text-ink-500"
        title={mark.title}
      >
        {mark.label}
      </span>
    )}
  </div>
);

export const TimelineRailMobile = ({
  isFirst,
  isLast,
  isCurrent,
}: {
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
}) => (
  <div className="absolute -left-6 bottom-0 top-0 z-10 w-6 md:hidden" aria-hidden>
    {isFirst && (
      <div
        className={`${LINE_CLASS} ${isCurrent ? 'bg-gradient-to-b from-transparent to-blue-300' : 'bg-gradient-to-b from-transparent to-slate-300 dark:to-ink-700'}`}
        style={{ top: 0, height: 26 }}
      />
    )}
    {!isLast && <div className={`${LINE_CLASS} ${LINE_TINT}`} style={LINE_SPAN} />}
    <div
      className={`absolute left-1/2 top-[20px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 bg-white dark:bg-ink-900 ${
        isCurrent ? 'border-blue-500 dark:border-blue-400' : 'border-slate-500 dark:border-ink-500'
      }`}
    />
    <div className="absolute left-1/2 top-[24px] h-0.5 w-3.5 bg-gradient-to-r from-slate-300 dark:from-ink-700 to-transparent" />
  </div>
);

export const TimelineGapLabel = ({ label }: { label: string }) => (
  <div className="pointer-events-none absolute -bottom-[26px] left-0 right-0 md:pl-[76px]">
    <span className="text-[11px] font-medium text-slate-400 dark:text-ink-500">{label}</span>
  </div>
);
