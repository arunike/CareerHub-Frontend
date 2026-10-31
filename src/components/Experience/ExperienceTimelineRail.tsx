import type { ReactNode } from 'react';
import type { TimelineMark } from '../../utils/Experience/roleTimeline';

const LINE_CLASS = 'absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full';
const LINE_TINT = 'bg-slate-300 dark:bg-ink-700';
// Reaches into the space-y-10 gap so the line never breaks between cards.
const LINE_SPAN = { top: 26, bottom: 'calc(-2.5rem - 26px)' } as const;

// Centred on the node, which sits 26px down inside a 52px avatar.
const INNER_RADIUS = 30;
const DIAL_STROKE = 3;
const RING_GAP = 6.5;
// A slot a year, and a second ring for the years after the first five.
const DIAL_SLOTS = 5;
// Rings. Past this the dial is full, so the longest tenures all read the same.
const LAPS_DRAWN = 2;
// The share of a slot left empty, which is what makes the segments countable.
const SLOT_GAP = 0.18;
const CAPPED_YEARS = DIAL_SLOTS * LAPS_DRAWN;

const radiusOf = (lap: number) => INNER_RADIUS + lap * RING_GAP;
// Sized for both rings whether or not the outer one is drawn, so the nodes line up.
const BOX = 2 * (radiusOf(LAPS_DRAWN - 1) + DIAL_STROKE);
// Clears the outer ring, since the label's own background is the only thing hiding an overlap.
const LABEL_TOP = BOX / 2 - 26 + 2;

// One tone a ring, deepening outward, so the second says it holds the years after the first.
const LAP_TONE = ['stroke-blue-500 dark:stroke-blue-400', 'stroke-blue-700 dark:stroke-blue-200'];
const TRACK_TONE = 'stroke-slate-200 dark:stroke-ink-700';

// One year's slot, filled whole or part way, placed by rotating a dashed circle.
const Segment = ({
  lap,
  slot,
  fill,
  tone,
}: {
  lap: number;
  slot: number;
  fill: number;
  tone: string;
}) => {
  const centre = BOX / 2;
  const circumference = 2 * Math.PI * radiusOf(lap);
  const length = (circumference / DIAL_SLOTS) * (1 - SLOT_GAP) * fill;
  return (
    <circle
      cx={centre}
      cy={centre}
      r={radiusOf(lap)}
      fill="none"
      strokeWidth={DIAL_STROKE}
      strokeLinecap="round"
      strokeDasharray={`${length} ${circumference - length}`}
      transform={`rotate(${-90 + slot * (360 / DIAL_SLOTS)} ${centre} ${centre})`}
      className={tone}
      style={{ pointerEvents: 'stroke' }}
    />
  );
};

// A segment a year round one ring: concentric rings 1px apart could not be counted.
const TenureDial = ({ mark }: { mark: TimelineMark }) => {
  const years = Math.min(mark.years, CAPPED_YEARS);
  const partial = years < CAPPED_YEARS ? mark.fraction : 0;
  // Only the rings the tenure has reached, so five years is not a dial of empty track.
  const laps = Array.from({ length: Math.min(LAPS_DRAWN, Math.floor(years / DIAL_SLOTS) + 1) });
  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{ width: BOX, height: BOX, top: 26 - BOX / 2 }}
      aria-hidden
    >
      <title>{mark.title}</title>
      {laps.map((_, lap) =>
        Array.from({ length: DIAL_SLOTS }, (_unused, slot) => {
          const served = Math.min(DIAL_SLOTS, Math.max(0, years - lap * DIAL_SLOTS));
          return (
            <Segment
              key={`${lap}-${slot}`}
              lap={lap}
              slot={slot}
              fill={1}
              // Every slot is drawn, so a year part way through has a track to sit in.
              tone={slot < served ? LAP_TONE[lap] : TRACK_TONE}
            />
          );
        })
      )}
      {/* Dimmed, so the year in progress is never mistaken for one that is served. */}
      {partial > 0 && (
        <Segment
          lap={Math.floor(years / DIAL_SLOTS)}
          slot={years % DIAL_SLOTS}
          fill={partial}
          tone={`${LAP_TONE[Math.floor(years / DIAL_SLOTS)]} opacity-70`}
        />
      )}
    </svg>
  );
};

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
    {mark && <TenureDial mark={mark} />}
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
        className="relative z-10 flex flex-col items-center gap-0.5 rounded bg-white/90 px-1 dark:bg-ink-900/90"
        style={{ marginTop: LABEL_TOP }}
        title={mark.title}
      >
        <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-400 dark:text-ink-500">
          {mark.label}
        </span>
        {/* The key to the dial, in text, because a phone has no hover to reach the title with. */}
        <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-400 dark:text-ink-500">
          {mark.tenure}
        </span>
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
