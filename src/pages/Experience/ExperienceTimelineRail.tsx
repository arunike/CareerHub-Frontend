import type { ReactNode } from 'react';

// Both variants share one line treatment: strongest at the node, fading as it travels down.
const LINE_CLASS = 'absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full';
const LINE_TINT = 'bg-slate-200';
// Reaches past the card into the 40px space before the next one, so the line never breaks.
const LINE_SPAN = { top: 26, bottom: 'calc(-2.5rem - 26px)' } as const;

export const TimelineRailDesktop = ({
  avatar,
  year,
  isFirst,
  isLast,
  isCurrent,
}: {
  avatar: ReactNode;
  year?: string;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
}) => (
  <div className="relative z-10 hidden w-[52px] shrink-0 flex-col items-center md:flex">
    {isFirst && (
      <>
        <div
          className={`${LINE_CLASS} ${isCurrent ? 'bg-gradient-to-b from-transparent to-blue-300' : 'bg-gradient-to-b from-transparent to-slate-200'}`}
          style={{ top: -18, height: 44 }}
        />
        {isCurrent && (
          <span
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-blue-400"
            style={{ top: -20 }}
            title="Current role"
          />
        )}
      </>
    )}
    {!isLast && <div className={`${LINE_CLASS} ${LINE_TINT}`} style={LINE_SPAN} />}
    <div className="relative z-10">{avatar}</div>
    {/* Connector into the card: the 24px column gap. */}
    <div
      className="absolute left-full top-[25px] h-0.5 w-5 bg-gradient-to-r from-slate-300 to-transparent"
      aria-hidden
    />
    {year && (
      <span className="relative z-10 mt-2 rounded bg-white/90 px-1 text-[11px] font-semibold tabular-nums text-slate-400">
        {year}
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
        className={`${LINE_CLASS} ${isCurrent ? 'bg-gradient-to-b from-transparent to-blue-300' : 'bg-gradient-to-b from-transparent to-slate-200'}`}
        style={{ top: 0, height: 26 }}
      />
    )}
    {!isLast && <div className={`${LINE_CLASS} ${LINE_TINT}`} style={LINE_SPAN} />}
    <div
      className={`absolute left-1/2 top-[20px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 bg-white ${
        isCurrent ? 'border-blue-400' : 'border-slate-300'
      }`}
    />
    <div className="absolute left-1/2 top-[24px] h-0.5 w-3.5 bg-gradient-to-r from-slate-300 to-transparent" />
  </div>
);

export const TimelineGapLabel = ({ label }: { label: string }) => (
  <div className="pointer-events-none absolute -bottom-[26px] left-0 right-0 md:pl-[76px]">
    <span className="text-[11px] font-medium text-slate-400">{label}</span>
  </div>
);
