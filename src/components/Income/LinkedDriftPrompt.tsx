import { Button } from 'antd';
import type { LinkedDrift } from '../../utils/Income/linkedDrift';
import type { GrossPinDrift } from '../../utils/Income/grossPinDrift';
import { formatPayDateShort } from '../../utils/Income/paySchedule';

type Props = {
  drift: LinkedDrift[];
  grossPins: GrossPinDrift[];
  onAccept: () => void;
  onDismiss: () => void;
  onSelectPaycheck?: (periodIndex: number) => void;
};

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

const uniform = (values: number[]) =>
  values.length > 0 && values.every((value) => value === values[0]) ? values[0] : null;

// A whole year of pinned paychecks would otherwise fill the bar and bury the buttons.
const MAX_CHIPS = 8;

// Hand-styled rather than an antd Tag: every tag colour it offers washes out on this amber.
const CHIP_BASE =
  'inline-flex items-center rounded-md border border-amber-300 bg-white text-[11px] font-medium text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-100';

const CHIP = `${CHIP_BASE} px-2 py-0.5`;

// Reaches the 44px touch floor below lg, where the antd buttons beside it already do.
const CHIP_LINK = `${CHIP_BASE} min-h-11 cursor-pointer px-3 py-0.5 transition-colors lg:min-h-0 lg:px-2 hover:border-amber-500 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:hover:border-amber-300/60 dark:hover:bg-amber-400/30`;

// Pulses rather than flashes: a hard blink is a seizure risk and reads as an error state.
const LinkedDriftPrompt = ({ drift, grossPins, onAccept, onDismiss, onSelectPaycheck }: Props) => {
  if (drift.length === 0 && grossPins.length === 0) return null;
  const pinnedRate = uniform(grossPins.map((entry) => entry.pinned));
  const scheduledRate = uniform(grossPins.map((entry) => entry.scheduled));
  const shown = grossPins.slice(0, MAX_CHIPS);
  const hidden = grossPins.length - shown.length;

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"
          aria-hidden
        />
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs leading-5 text-amber-900 dark:text-amber-200">
            {drift.length > 0 ? (
              <>
                <span className="font-semibold">The linked offer has moved on.</span>{' '}
                {drift.map((entry, index) => (
                  <span key={entry.field}>
                    {index > 0 ? '; ' : ''}
                    {entry.label} is pinned at {money(entry.pinned)} here but reads{' '}
                    {money(entry.linked)} there
                  </span>
                ))}
                .{' '}
              </>
            ) : null}
            {grossPins.length > 0 ? (
              <>
                <span className="font-semibold">
                  A raise cannot reach {grossPins.length} paycheck
                  {grossPins.length === 1 ? '' : 's'}.
                </span>{' '}
                {pinnedRate != null && scheduledRate != null
                  ? `Pinned at ${money(pinnedRate)} rather than the scheduled ${money(scheduledRate)}.`
                  : 'Each is pinned to a gross the schedule has moved past.'}
              </>
            ) : null}
          </p>
          {grossPins.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {shown.map((entry) => {
                const label = entry.payDate
                  ? formatPayDateShort(entry.payDate)
                  : `#${entry.periodIndex}`;
                return onSelectPaycheck ? (
                  <button
                    key={entry.periodIndex}
                    type="button"
                    className={CHIP_LINK}
                    aria-label={`Open the paycheck on ${label}`}
                    onClick={() => onSelectPaycheck(entry.periodIndex)}
                  >
                    {label}
                  </button>
                ) : (
                  <span key={entry.periodIndex} className={CHIP}>
                    {label}
                  </span>
                );
              })}
              {hidden > 0 ? <span className={CHIP}>+{hidden} more</span> : null}
            </div>
          ) : null}
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
