import { Button } from 'antd';
import type { LinkedDrift } from '../../utils/Income/linkedDrift';

type Props = {
  drift: LinkedDrift[];
  onAccept: () => void;
  onDismiss: () => void;
};

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

// Pulses rather than flashes: a hard blink is a seizure risk and reads as an error state.
const LinkedDriftPrompt = ({ drift, onAccept, onDismiss }: Props) => {
  if (drift.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"
          aria-hidden
        />
        <div className="min-w-0 text-xs leading-5 text-amber-900 dark:text-amber-200">
          <span className="font-semibold">The linked offer has moved on.</span>{' '}
          {drift.map((entry, index) => (
            <span key={entry.field}>
              {index > 0 ? '; ' : ''}
              {entry.label} is pinned at {money(entry.pinned)} here but reads {money(entry.linked)}{' '}
              there
            </span>
          ))}
          .
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="small" onClick={onDismiss}>
          Keep mine
        </Button>
        <Button size="small" type="primary" onClick={onAccept}>
          Use the new value
        </Button>
      </div>
    </div>
  );
};

export default LinkedDriftPrompt;
