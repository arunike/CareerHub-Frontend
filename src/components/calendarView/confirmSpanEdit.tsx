import { Button } from 'antd';
import Modal from '../MobileModal';
import type { Event } from '../../types';

export const isSpanEvent = (event: Event) =>
  Boolean(event.end_date && event.end_date !== event.date);

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
