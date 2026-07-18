import { SlidersOutlined } from '@ant-design/icons';
import { useState } from 'react';
import ModalShell from '../../../components/ModalShell';
import type { DayOneGcStatus, VisaSponsorshipStatus } from '../calculations';
import {
  getImmigrationSignalPatch,
  getImmigrationSignalValue,
  immigrationSignalOptions,
  type ImmigrationSignalValue,
} from '../immigrationSignal';

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

const scoreOptions = [
  { value: '', label: 'Not scored' },
  { value: 1, label: '1 - Weak' },
  { value: 2, label: '2 - Below avg' },
  { value: 3, label: '3 - Solid' },
  { value: 4, label: '4 - Strong' },
  { value: 5, label: '5 - Excellent' },
];

const toScore = (value: string) => {
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
};

const compactSignalCount = (values: Array<unknown>) =>
  values.filter((value) => value != null && value !== '').length;

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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const immigrationSignalValue = getImmigrationSignalValue(visaSponsorship, dayOneGc);
  const filledSignalCount = compactSignalCount([
    immigrationSignalValue,
    growthScore,
    workLifeScore,
    brandScore,
    teamScore,
  ]);
  const selectedImmigrationOption = immigrationSignalOptions.find(
    (option) => option.value === immigrationSignalValue
  );

  const handleImmigrationChange = (value: ImmigrationSignalValue) => {
    const patch = getImmigrationSignalPatch(value);
    onVisaSponsorshipChange(patch.visa_sponsorship);
    onDayOneGcChange(patch.day_one_gc);
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700 shadow-sm">
                <SlidersOutlined />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-950">Advanced Decision Signals</h3>
                <p className="mt-0.5 max-w-xl text-xs leading-5 text-slate-500">
                  Optional inputs for growth, work-life, team quality, brand value, and immigration
                  support.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 active:translate-y-px sm:h-9"
            >
              <SlidersOutlined />
              Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pl-12">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
              {filledSignalCount} filled
            </span>
            {selectedImmigrationOption && (
              <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                {selectedImmigrationOption.label}
              </span>
            )}
          </div>
        </div>
      </section>

      <ModalShell
        isOpen={isEditorOpen}
        title="Advanced Decision Signals"
        onClose={() => setIsEditorOpen(false)}
        maxWidthClass="max-w-3xl"
        bodyClassName="flex-1 min-h-0 overflow-y-auto bg-slate-50"
        zIndex={1200}
        footer={
          <button
            type="button"
            onClick={() => setIsEditorOpen(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 active:translate-y-px"
          >
            Done
          </button>
        }
      >
        <div className="p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <SlidersOutlined />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-950">Offer quality signals</h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Keep these blank when you do not have enough evidence. Blank values are skipped in
                  the scorecard.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Immigration support
                </span>
                <select
                  value={immigrationSignalValue}
                  onChange={(event) =>
                    handleImmigrationChange(event.target.value as ImmigrationSignalValue)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Leave blank for now</option>
                  {immigrationSignalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {selectedImmigrationOption?.description ||
                    'Use this only when immigration support materially affects your decision.'}
                </p>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    label: 'Growth',
                    value: growthScore,
                    onChange: onGrowthScoreChange,
                  },
                  {
                    label: 'Work-life balance',
                    value: workLifeScore,
                    onChange: onWorkLifeScoreChange,
                  },
                  {
                    label: 'Brand value',
                    value: brandScore,
                    onChange: onBrandScoreChange,
                  },
                  {
                    label: 'Manager / team',
                    value: teamScore,
                    onChange: onTeamScoreChange,
                  },
                ].map((signal) => (
                  <label key={signal.label} className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      {signal.label}
                    </span>
                    <select
                      value={signal.value ?? ''}
                      onChange={(event) => signal.onChange(toScore(event.target.value))}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      {scoreOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>
      </ModalShell>
    </>
  );
};

export default DecisionSignalsSection;
