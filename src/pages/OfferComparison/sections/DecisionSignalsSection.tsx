import { Rate } from 'antd';
import type { DayOneGcStatus, VisaSponsorshipStatus } from '../calculations';
import {
  getImmigrationSignalPatch,
  getImmigrationSignalValue,
  immigrationSignalOptions,
  type ImmigrationSignalValue,
} from '../immigrationSignal';
import { SIGNAL_TIERS, scoreFromStars, signalTierLabel, starsFromScore } from './signalScore';

type DecisionSignalsSectionProps = {
  visaSponsorship: VisaSponsorshipStatus;
  onVisaSponsorshipChange: (value: VisaSponsorshipStatus) => void;
  dayOneGc: DayOneGcStatus;
  onDayOneGcChange: (value: DayOneGcStatus) => void;
  growthScore?: number | null;
  onGrowthScoreChange: (value: number | null) => void;
  workLifeScore?: number | null;
  onWorkLifeScoreChange: (value: number | null) => void;
  brandScore?: number | null;
  onBrandScoreChange: (value: number | null) => void;
  teamScore?: number | null;
  onTeamScoreChange: (value: number | null) => void;
};

const SELECT_CLASS =
  'h-11 w-full rounded-xl border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 text-sm text-slate-900 dark:text-ink-50 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

const DecisionSignalsSection = ({
  visaSponsorship,
  onVisaSponsorshipChange,
  dayOneGc,
  onDayOneGcChange,
  growthScore,
  onGrowthScoreChange,
  workLifeScore,
  onWorkLifeScoreChange,
  brandScore,
  onBrandScoreChange,
  teamScore,
  onTeamScoreChange,
}: DecisionSignalsSectionProps) => {
  const immigrationSignalValue = getImmigrationSignalValue(visaSponsorship, dayOneGc);
  const selectedImmigrationOption = immigrationSignalOptions.find(
    (option) => option.value === immigrationSignalValue
  );

  const handleImmigrationChange = (value: ImmigrationSignalValue) => {
    const patch = getImmigrationSignalPatch(value);
    onVisaSponsorshipChange(patch.visa_sponsorship);
    onDayOneGcChange(patch.day_one_gc);
  };

  const signals = [
    { label: 'Growth', value: growthScore, onChange: onGrowthScoreChange },
    { label: 'Work-life balance', value: workLifeScore, onChange: onWorkLifeScoreChange },
    { label: 'Brand value', value: brandScore, onChange: onBrandScoreChange },
    { label: 'Manager / team', value: teamScore, onChange: onTeamScoreChange },
  ];

  return (
    <div className="space-y-4">
      {/* No inner card: the parent section already carries the heading and the border. */}
      <p className="text-xs leading-5 text-slate-500 dark:text-ink-400">
        Leave a signal blank when you do not have enough evidence — a blank category is skipped in
        the scorecard rather than scored low.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {signals.map((signal) => (
          <div
            key={signal.label}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/[0.08] dark:bg-ink-900"
          >
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-ink-100">
              {signal.label}
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {/* allowClear is what keeps blank reachable: clicking the set star blanks it again. */}
              <Rate
                allowClear
                count={5}
                tooltips={[...SIGNAL_TIERS]}
                value={starsFromScore(signal.value)}
                onChange={(stars) => signal.onChange(scoreFromStars(stars))}
                aria-label={signal.label}
              />
              <span
                className={`text-[11.5px] tabular-nums ${
                  signal.value == null
                    ? 'text-slate-400 dark:text-ink-500'
                    : 'font-semibold text-slate-700 dark:text-ink-100'
                }`}
              >
                {signalTierLabel(signal.value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <label className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/[0.08] dark:bg-ink-900">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-ink-100">
          Immigration support
        </span>
        <select
          value={immigrationSignalValue}
          onChange={(event) =>
            handleImmigrationChange(event.target.value as ImmigrationSignalValue)
          }
          className={SELECT_CLASS}
        >
          <option value="">Leave blank for now</option>
          {immigrationSignalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-ink-400">
          {selectedImmigrationOption?.description ||
            'Use this only when immigration support materially affects your decision.'}
        </p>
      </label>
    </div>
  );
};

export default DecisionSignalsSection;
