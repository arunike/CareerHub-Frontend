import Modal from '../MobileModal';
import { ArrowRightOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import type { Event, Holiday } from '../../types';
import { buildEventMovePatch, eventSpanDays } from './utils';

type MoveHandler<T> = (item: T, day: Date) => boolean | void | Promise<boolean | void>;

const prettyDate = (day: Date) => format(day, 'EEE, MMM d, yyyy');

// Keyed yyyy-MM-dd; parsed directly it reads as UTC midnight and shifts a day west of Greenwich.
const parseApiDate = (value: string) => new Date(`${value}T00:00:00`);

const MoveSummary = ({
  name,
  from,
  to,
  footnote,
  spanDays = 1,
  movedEnd,
}: {
  name: string;
  from: Date;
  to: Date;
  footnote?: ReactNode;
  spanDays?: number;
  movedEnd?: Date;
}) => (
  <div className="mt-1 space-y-3">
    <p className="text-sm font-semibold text-slate-900">{name}</p>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-500 line-through decoration-slate-300">
        {prettyDate(from)}
      </span>
      <ArrowRightOutlined className="text-xs text-slate-400" />
      <span className="text-sm font-semibold text-slate-900">
        {prettyDate(to)}
        {movedEnd && ` – ${prettyDate(movedEnd)}`}
      </span>
    </div>
    {spanDays > 1 && (
      <p className="text-xs text-slate-500">
        The whole {spanDays}-day span moves together, keeping its length.
      </p>
    )}
    {footnote && <p className="text-xs text-slate-500">{footnote}</p>}
  </div>
);

const baseOptions = {
  icon: null,
  width: 440,
  cancelText: 'Cancel',
} as const;

export const confirmEventMove = (event: Event, day: Date, onMove: MoveHandler<Event>) =>
  Modal.confirm({
    ...baseOptions,
    title: 'Move this event?',
    content: (
      <MoveSummary
        name={event.name}
        from={parseApiDate(event.date)}
        to={day}
        spanDays={eventSpanDays(event)}
        movedEnd={
          event.end_date ? parseApiDate(buildEventMovePatch(event, day).end_date!) : undefined
        }
        footnote={
          event.is_all_day
            ? 'This is an all-day event.'
            : event.start_time
              ? `Starts at ${event.start_time.substring(0, 5)} — the time does not change.`
              : 'Only the date changes.'
        }
      />
    ),
    okText: 'Move event',
    onOk: () => onMove(event, day),
  });

export const confirmHolidayMove = (holiday: Holiday, day: Date, onMove: MoveHandler<Holiday>) =>
  Modal.confirm({
    ...baseOptions,
    title: 'Move this time off?',
    content: (
      <MoveSummary
        name={holiday.description || 'Untitled time off'}
        from={parseApiDate(holiday.date)}
        to={day}
      />
    ),
    okText: 'Move time off',
    onOk: () => onMove(holiday, day),
  });
