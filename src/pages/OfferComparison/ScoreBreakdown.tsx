import clsx from 'clsx';
import type { DecisionRow } from './decisionScoring';

export const ScoreBreakdownContent = ({ row }: { row: DecisionRow }) => {
  const scored = row.categories.filter((c) => c.isScored);
  const skipped = row.categories.filter((c) => !c.isScored);
  const activeWeightTotal = scored.reduce((s, c) => s + c.weight, 0) || 1;
  const rawSum = scored.reduce((s, c) => s + c.score * c.weight, 0);

  return (
    <div className="w-[min(360px,calc(100vw-32px))] text-xs">
      {/* Step 1 */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500 mb-2">
          Step 1 — Weighted points per category
        </p>
        <div className="space-y-2">
          {scored.map((c) => {
            const rawPts = (c.score * c.weight) / 100;
            return (
              <div key={c.key}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                  <span className="font-semibold text-slate-700 dark:text-ink-100">{c.label}</span>
                  <span className="break-words text-right font-mono text-[11px] text-slate-500 dark:text-ink-400">
                    {Math.round(c.score)} × {c.weight}% ={' '}
                    <span className="font-bold text-slate-800 dark:text-ink-50">
                      {rawPts.toFixed(2)} pts
                    </span>
                  </span>
                </div>
                <div className="text-[11px] leading-4 text-slate-400 dark:text-ink-500">
                  {c.detail}
                </div>
                {c.calculationLines && c.calculationLines.length > 0 && (
                  <dl className="mt-1.5 divide-y divide-slate-200/70 dark:divide-white/[0.08] overflow-hidden rounded-lg border border-slate-200/70 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900">
                    {c.calculationLines.map((line, index) => {
                      const split = line.indexOf(': ');
                      const label = split > 0 ? line.slice(0, split) : null;
                      const value = split > 0 ? line.slice(split + 2) : line;
                      const isResult = index === c.calculationLines!.length - 1;
                      return (
                        <div
                          key={`${index}-${line}`}
                          className={`px-2.5 py-1.5 ${isResult ? 'bg-white/80 dark:bg-ink-900/80' : ''}`}
                        >
                          {label ? (
                            <dt
                              className={`text-[11px] leading-5 ${
                                isResult
                                  ? 'font-bold text-slate-700 dark:text-ink-100'
                                  : 'font-semibold text-slate-500 dark:text-ink-400'
                              }`}
                            >
                              {label}
                            </dt>
                          ) : null}
                          <dd
                            className={`m-0 whitespace-normal break-words text-[11px] leading-5 tabular-nums ${
                              isResult
                                ? 'font-semibold text-slate-800 dark:text-ink-50'
                                : 'text-slate-600 dark:text-ink-200'
                            }`}
                          >
                            {value}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sum */}
      <div className="border-t border-slate-100 dark:border-white/[0.07] pt-2 mb-3">
        <div className="flex items-center justify-between text-slate-700 dark:text-ink-100 font-semibold">
          <span>Sum of weighted pts</span>
          <span className="font-mono">{(rawSum / 100).toFixed(2)} pts</span>
        </div>
      </div>

      {/* Step 2 */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500 mb-1">
          Step 2 — Normalise for skipped categories
        </p>
        {skipped.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-ink-400">
            All categories filled — no normalisation needed. Active weight = 100%.
          </p>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg px-3 py-2 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
            <p className="mb-1">
              <span className="font-semibold">{skipped.map((c) => c.label).join(', ')}</span> (
              {skipped.reduce((s, c) => s + c.weight, 0)}% weight){' '}
              {skipped.length === 1 ? 'is' : 'are'} skipped.
            </p>
            <p>
              The remaining active categories only add up to <strong>{activeWeightTotal}%</strong>.
              To preserve the configured relative weights, the sum is divided by {activeWeightTotal}
              % — this stretches the remaining categories proportionally, so you're not penalised
              for leaving optional fields empty. The total may exceed 100 when Financial exceeds its
              $300k benchmark.
            </p>
          </div>
        )}
      </div>

      {/* Final */}
      <div className="border-t border-slate-200 dark:border-white/[0.08] pt-2 bg-sky-50 dark:bg-sky-500/10 rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-800 dark:text-ink-50">Total Score</p>
            <p className="text-[10px] text-slate-500 dark:text-ink-400 font-mono mt-0.5">
              {(rawSum / 100).toFixed(2)} pts ÷ {activeWeightTotal / 100} = {row.score}
            </p>
          </div>
          <span className="text-2xl font-black text-sky-600 dark:text-sky-300">{row.score}</span>
        </div>
      </div>
    </div>
  );
};

// Gross, not realizable, so each line reconciles with the number above it.
export const ComponentDelta = ({
  value,
  baseline,
  baselineLabel,
}: {
  value: number;
  baseline: number;
  baselineLabel: string;
}) => {
  const diff = Math.round(value - baseline);
  if (diff === 0) {
    return (
      <div className="text-[10px] font-medium text-slate-400 dark:text-ink-500">
        Same as {baselineLabel}
      </div>
    );
  }
  return (
    <div
      className={clsx(
        'text-[10px] font-semibold',
        diff > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-500 dark:text-rose-400'
      )}
    >
      {diff > 0 ? '+' : '\u2212'}${Math.abs(diff).toLocaleString()} vs {baselineLabel}
    </div>
  );
};
