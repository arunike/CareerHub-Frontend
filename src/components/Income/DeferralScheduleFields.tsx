import { Button, Checkbox, DatePicker } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import UnitNumberInput from '../inputs/UnitNumberInput';
import { Field } from './electionsFormPrimitives';
import type { DeferralPlan, DeferralStep } from '../../utils/Income/deferralSchedule';

type Props = {
  plan: DeferralPlan;
  onChange: (plan: DeferralPlan) => void;
};

const newId = () => `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const DeferralScheduleFields = ({ plan, onChange }: Props) => {
  const steps = [...plan.steps].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

  const patchStep = (id: string, patch: Partial<DeferralStep>) =>
    onChange({
      ...plan,
      steps: plan.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    });

  return (
    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-ink-900">
      <span className="text-xs font-medium text-slate-600 dark:text-ink-200">Rate changes</span>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-ink-400">
        Paychecks before the first change keep the rate above. A rate typed on a single paycheck
        still wins over this.
      </p>

      {steps.length > 0 ? (
        <div className="mt-2.5 space-y-2">
          <div className="hidden gap-2 text-[10px] uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[1fr_auto_auto_auto] dark:text-ink-500">
            <span>From</span>
            <span>Traditional</span>
            <span>Roth</span>
            <span />
          </div>
          {steps.map((step) => (
            <div key={step.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <DatePicker
                size="small"
                className="w-full"
                value={step.effectiveDate ? dayjs(step.effectiveDate) : null}
                onChange={(date) =>
                  patchStep(step.id, { effectiveDate: date ? date.format('YYYY-MM-DD') : '' })
                }
              />
              <UnitNumberInput
                unit="%"
                min={0}
                max={100}
                value={step.pretaxPercent}
                onChange={(value) => patchStep(step.id, { pretaxPercent: Number(value ?? 0) })}
                aria-label="Traditional percent from this date"
              />
              <UnitNumberInput
                unit="%"
                min={0}
                max={100}
                value={step.rothPercent}
                onChange={(value) => patchStep(step.id, { rothPercent: Number(value ?? 0) })}
                aria-label="Roth percent from this date"
              />
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                aria-label="Remove this rate change"
                onClick={() =>
                  onChange({ ...plan, steps: plan.steps.filter((row) => row.id !== step.id) })
                }
              />
            </div>
          ))}
        </div>
      ) : null}

      <Button
        size="small"
        icon={<PlusOutlined />}
        className="mt-2.5"
        onClick={() =>
          onChange({
            ...plan,
            steps: [
              ...plan.steps,
              {
                id: newId(),
                effectiveDate: dayjs().format('YYYY-MM-DD'),
                pretaxPercent: 0,
                rothPercent: 0,
              },
            ],
          })
        }
      >
        Add a rate change
      </Button>

      <div className="mt-3 border-t border-slate-200 pt-2.5 dark:border-white/[0.08]">
        <Checkbox
          checked={plan.escalation.enabled}
          onChange={(event) =>
            onChange({
              ...plan,
              escalation: { ...plan.escalation, enabled: event.target.checked },
            })
          }
        >
          <span className="text-xs">Increase automatically each year</span>
        </Checkbox>
        {plan.escalation.enabled ? (
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Increase by each year"
              hint="Percentage points added on each anniversary."
            >
              <UnitNumberInput
                unit="%"
                min={0}
                max={100}
                value={plan.escalation.percentPerYear}
                onChange={(value) =>
                  onChange({
                    ...plan,
                    escalation: { ...plan.escalation, percentPerYear: Number(value ?? 0) },
                  })
                }
              />
            </Field>
            <Field
              label="Stop at"
              hint="Most plans cap auto-escalation at 10-15%. Leave it empty to climb with no ceiling."
            >
              <UnitNumberInput
                unit="%"
                min={0}
                max={100}
                // Blank, not 0: "Stop at 0%" reads as stopping at nothing, which is the opposite.
                value={plan.escalation.capPercent || null}
                placeholder="No cap"
                onChange={(value) =>
                  onChange({
                    ...plan,
                    escalation: { ...plan.escalation, capPercent: Number(value ?? 0) },
                  })
                }
              />
            </Field>
          </div>
        ) : null}
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-ink-400">
          Points a year, not a share of the rate: 6% stepping by 1 becomes 7%. It climbs on each
          anniversary of the rate in force. Set the step to 0 for no change. The annual dollar limit
          still applies on top of this.
        </p>
      </div>
    </div>
  );
};

export default DeferralScheduleFields;
