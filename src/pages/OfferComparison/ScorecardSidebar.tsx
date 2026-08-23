import type React from 'react';
import { Select } from 'antd';
import { PlusOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import HelpTooltipTrigger from '../../components/HelpTooltipTrigger';
import UnitNumberInput from '../../components/UnitNumberInput';
import { CATEGORY_LABELS, VISA_OVERLAY_WEIGHT, clamp } from './decisionScoring';
import type { CategoryKey } from './decisionScoring';
import type { MaritalStatus } from './offerTypes';

type Props = {
  anyImmigrationSignal: boolean;
  isWeightsExpanded: boolean;
  setIsWeightsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  maritalStatus: MaritalStatus;
  setMaritalStatus: (status: MaritalStatus) => void;
  maritalStatusOptions: { code: string; label: string }[];
  saveAdjustments: () => void;
  onAddScenario: () => void;
  weights: Record<CategoryKey, number>;
  setWeights: React.Dispatch<React.SetStateAction<Record<CategoryKey, number>>>;
};

const ScorecardSidebar = ({
  anyImmigrationSignal,
  isWeightsExpanded,
  setIsWeightsExpanded,
  maritalStatus,
  setMaritalStatus,
  maritalStatusOptions,
  saveAdjustments,
  onAddScenario,
  weights,
  setWeights,
}: Props) => (
  <aside className="flex h-fit flex-col gap-6 lg:sticky lg:top-6">
    {/* Simulation Settings */}
    <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Offer Simulations</h3>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            "What-If" Scenarios
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Tax Marital Status
          </label>
          <Select
            value={maritalStatus}
            onChange={setMaritalStatus}
            options={maritalStatusOptions.map((o: { code: string; label: string }) => ({
              value: o.code,
              label: o.label,
            }))}
            className="w-full"
            size="small"
          />
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onAddScenario}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <PlusOutlined /> Add Custom Scenario
          </button>
          <button
            type="button"
            onClick={saveAdjustments}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>

    {/* Score Weights */}
    <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
      <div className={clsx('flex items-center gap-2', isWeightsExpanded ? 'mb-6' : 'mb-0')}>
        <button
          type="button"
          aria-expanded={isWeightsExpanded}
          aria-controls="score-weights-panel"
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer select-none items-center justify-between rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          onClick={() => setIsWeightsExpanded((current) => !current)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 16 4 4 4-4" />
                <path d="M7 20V4" />
                <path d="m21 8-4-4-4 4" />
                <path d="M17 4v16" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Score Weights</h3>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Current Distribution
              </p>
            </div>
          </div>
          <div className="shrink-0 text-slate-400" aria-hidden="true">
            {isWeightsExpanded ? (
              <DownOutlined className="text-xs" />
            ) : (
              <RightOutlined className="text-xs" />
            )}
          </div>
        </button>
        <HelpTooltipTrigger
          ariaLabel="Explain score weights formula"
          density="comfortable"
          className="shrink-0 text-slate-400"
          title={
            <div className="space-y-1.5 p-1 text-[11px] leading-relaxed text-slate-200">
              <p className="font-semibold text-white">General Formula</p>
              <p>
                Most categories create a 0-100 score. Financial uses an uncapped logarithmic score
                where $300k adjusted annual value = 100. Total score = sum(category score × weight)
                / active weight, so exceptional Financial values can push the total above 100.
                Detailed field-level math lives in each offer's Total Score popover.
              </p>
              <p className="border-t border-slate-700 pt-1 text-[10px] text-slate-400">
                Includes money adjustments, location friction, PTO/holidays, manual signals, and
                immigration when filled.
              </p>
            </div>
          }
        />
      </div>

      {isWeightsExpanded &&
        (() => {
          const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
          const remaining = 100 - totalWeight;
          const isOver = totalWeight > 100;
          const isNear = totalWeight >= 95 && totalWeight < 100;
          const isExact = totalWeight === 100;

          const barColor = isOver
            ? 'bg-rose-500'
            : isExact
              ? 'bg-emerald-500'
              : isNear
                ? 'bg-amber-400'
                : 'bg-sky-500';

          const labelColor = isOver
            ? 'text-rose-600'
            : isExact
              ? 'text-emerald-600'
              : isNear
                ? 'text-amber-600'
                : 'text-slate-500';

          return (
            <div id="score-weights-panel" className="space-y-3">
              {/* Total indicator */}
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Total Weight
                  </span>
                  <span className={`text-xs font-bold tabular-nums ${labelColor}`}>
                    {totalWeight}%{' '}
                    {isOver
                      ? '— over limit!'
                      : isExact
                        ? '— balanced'
                        : isNear
                          ? `(${remaining}% left) — warning`
                          : `(${remaining}% left)`}
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.min(totalWeight, 100)}%` }}
                  />
                </div>
                {isOver && (
                  <p className="mt-1.5 text-[10px] text-rose-500 font-medium">
                    Reduce by {totalWeight - 100}% to stay within budget.
                  </p>
                )}
              </div>

              {/* Weight sliders */}
              {(Object.entries(weights) as [CategoryKey, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([key, weight]) => {
                  const isOptional = ['workLife', 'growth', 'brand', 'team'].includes(key);
                  return (
                    <div
                      key={key}
                      className={clsx(
                        'flex items-center justify-between rounded-2xl border p-3 shadow-sm transition-colors hover:border-sky-200',
                        isOver ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white'
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">
                          {CATEGORY_LABELS[key]}
                        </span>
                        {isOptional && (
                          <span className="text-[10px] font-medium text-slate-400">Optional</span>
                        )}
                      </div>
                      <UnitNumberInput
                        unit="%"
                        min={0}
                        max={100}
                        value={weight}
                        onChange={(val) =>
                          setWeights((prev) => ({ ...prev, [key]: clamp(val ?? 0) }))
                        }
                        className={clsx(
                          'w-[92px] text-xs font-bold text-right [&_.ant-input-number-input]:!font-bold',
                          isOver
                            ? '[&_.ant-input-number]:!bg-rose-50 [&_.ant-input-number-input]:!text-rose-600'
                            : '[&_.ant-input-number]:!bg-sky-50 [&_.ant-input-number-input]:!text-sky-700'
                        )}
                        controls={false}
                      />
                    </div>
                  );
                })}

              {anyImmigrationSignal && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                  <span className="text-xs font-bold text-amber-700">Immigration</span>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Fixed {VISA_OVERLAY_WEIGHT}% overlay — auto-added for offers with visa/GC data.
                    Other weights scale down proportionally.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  </aside>
);

export default ScorecardSidebar;
