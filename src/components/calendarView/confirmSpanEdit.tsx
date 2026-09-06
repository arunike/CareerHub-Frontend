import { Button } from 'antd';
import { format } from 'date-fns';
import Modal from '../MobileModal';
import type { Event } from '../../types';

export type SpanEditScope = 'day' | 'all';

const prettyDay = (value: string) => format(new Date(`${value}T00:00:00`), 'EEE, MMM d');

export const isSpanEvent = (event: Event) =>
  Boolean(event.end_date && event.end_date !== event.date);

// Asks whether an edit applies to the one day that was clicked or to the whole span.
export const askSpanEditScope = (
  event: Event,
  day: string,
  onChoose: (scope: SpanEditScope) => void
) => {
  const dialog = Modal.confirm({
    title: 'Edit which days?',
    icon: null,
    width: 460,
    content: (
      <div className="mt-1 space-y-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-ink-50">{event.name}</p>
        <p className="text-sm text-slate-500 dark:text-ink-400">
          This runs {prettyDay(event.date)} – {prettyDay(event.end_date!)}. You clicked{' '}
          <strong>{prettyDay(day)}</strong>.
        </p>
      </div>
    ),
    footer: () => (
      <div className="careerhub-dialog-actions">
        <Button onClick={() => dialog.destroy()}>Cancel</Button>
        <Button
          onClick={() => {
            dialog.destroy();
            onChoose('day');
          }}
        >
          This day only
        </Button>
        <Button
          type="primary"
          onClick={() => {
            dialog.destroy();
            onChoose('all');
          }}
        >
          All days
        </Button>
      </div>
    ),
  });
};

// Editing the whole span would otherwise silently wipe days edited on their own.
export const askOverrideOverwrite = (
  count: number,
  onChoose: (discardOverrides: boolean) => void
) => {
  const dialog = Modal.confirm({
    title: 'Some days were edited separately',
    icon: null,
    width: 460,
    content: (
      <p className="mt-1 text-sm text-slate-500 dark:text-ink-400">
        {count === 1 ? '1 day has' : `${count} days have`} its own version. Applying this change to
        all days can either leave {count === 1 ? 'it' : 'them'} alone or replace{' '}
        {count === 1 ? 'it' : 'them'} with the span.
      </p>
    ),
    footer: () => (
      <div className="careerhub-dialog-actions">
        <Button onClick={() => dialog.destroy()}>Cancel</Button>
        <Button
          onClick={() => {
            dialog.destroy();
            onChoose(false);
          }}
        >
          Keep {count === 1 ? 'it' : 'them'}
        </Button>
        <Button
          danger
          type="primary"
          onClick={() => {
            dialog.destroy();
            onChoose(true);
          }}
        >
          Overwrite {count === 1 ? 'it' : 'them'}
        </Button>
      </div>
    ),
  });
};
