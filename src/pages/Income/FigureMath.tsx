import { Fragment } from 'react';
import { Popover } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { MathBreakdown, MathStep } from './mathBreakdown';
import { useMoney } from './amountPrivacy';

const OPERATOR: Record<string, string> = { plus: '+', minus: '−', times: '×' };

// The prose hint and the arithmetic share one trigger rather than sitting on two icons.
const FigureMath = ({
  label,
  breakdown,
  hint,
}: {
  label: string;
  breakdown?: MathBreakdown;
  hint?: string;
}) => {
  const { money } = useMoney();
  // An all-zero table, or one line restating the figure, explains nothing; the prose survives.
  const worthShowing =
    breakdown &&
    breakdown.steps.some((step) => Math.abs(step.value) > 0.005) &&
    // One line still earns the table when it names the payrolls behind it.
    (breakdown.steps.length > 1 || breakdown.steps.some((step) => (step.parts?.length ?? 0) > 0));
  const math = worthShowing ? breakdown : undefined;
  const prose = [breakdown && !worthShowing ? breakdown.footnote : undefined, hint]
    .filter(Boolean)
    .join(' ');
  if (!math && !prose) return null;

  const show = (step: MathStep) => {
    if (step.kind === 'factor') return `${(step.value * 100).toFixed(step.value < 0.1 ? 1 : 0)}%`;
    if (step.kind === 'percent') return `${step.value.toFixed(1)}%`;
    return money(Math.abs(step.value));
  };

  return (
    <Popover
      trigger={['hover', 'click']}
      placement="bottomLeft"
      content={
        <div className="max-w-[19rem]">
          {math ? (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-ink-400">
                How {label.toLowerCase()} is worked out
              </p>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {math.steps.map((step, index) => (
                    <Fragment key={step.label}>
                      <tr className="align-baseline">
                        <td className="w-3 pr-1 text-right font-medium text-slate-500 dark:text-ink-400">
                          {index === 0 ? '' : OPERATOR[step.op ?? 'plus']}
                        </td>
                        <td className="py-0.5 pr-3 text-slate-600 dark:text-ink-200">
                          {step.label}
                          {step.note ? (
                            <span className="block text-[11px] leading-snug text-slate-500 dark:text-ink-400">
                              {step.note}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-0.5 text-right tabular-nums text-slate-800 dark:text-ink-50">
                          {show(step)}
                        </td>
                      </tr>
                      {/* Which payroll each line came from: a follow-up, so quieter. */}
                      {(step.parts ?? []).map((part) => (
                        <tr key={`${step.label}-${part.label}`} className="align-baseline">
                          <td />
                          <td className="pb-0.5 pl-3 pr-3 text-[11px] text-slate-500 dark:text-ink-400">
                            {part.label}
                          </td>
                          <td className="pb-0.5 text-right text-[11px] tabular-nums text-slate-500 dark:text-ink-400">
                            {money(part.value)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  <tr className="align-baseline">
                    <td />
                    <td className="border-t border-slate-200 dark:border-white/[0.08] pt-1.5 pr-3 font-semibold text-slate-700 dark:text-ink-100">
                      {math.totalLabel}
                    </td>
                    <td className="border-t border-slate-200 dark:border-white/[0.08] pt-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-ink-50">
                      {money(math.total)}
                    </td>
                  </tr>
                  {/* The same figure each role's own card shows, so the two can be checked. */}
                  {(math.totalParts ?? []).map((part) => (
                    <tr key={`total-${part.label}`} className="align-baseline">
                      <td />
                      <td className="pb-0.5 pl-3 pr-3 text-[11px] text-slate-500 dark:text-ink-400">
                        {part.label}
                      </td>
                      <td className="pb-0.5 text-right text-[11px] tabular-nums text-slate-500 dark:text-ink-400">
                        {money(part.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {math.footnote ? (
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-ink-400">
                  {math.footnote}
                </p>
              ) : null}
            </>
          ) : null}
          {prose ? (
            <p
              className={`text-[11px] leading-relaxed text-slate-500 dark:text-ink-400 ${math ? 'mt-2 border-t border-slate-100 dark:border-white/[0.07] pt-2' : ''}`}
            >
              {prose}
            </p>
          ) : null}
        </div>
      }
    >
      <button
        type="button"
        aria-label={`How ${label.toLowerCase()} is worked out`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-300 dark:text-ink-600 transition-colors hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <InfoCircleOutlined />
      </button>
    </Popover>
  );
};

export default FigureMath;
