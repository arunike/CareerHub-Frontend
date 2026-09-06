import React, { useEffect, useMemo, useState } from 'react';
import { Select, Tooltip } from 'antd';
import { RiseOutlined, ArrowUpOutlined, ArrowDownOutlined, SwapOutlined } from '@ant-design/icons';
import Modal from '../../components/MobileModal';
import type { Experience } from '../../types';
import type { ExperienceCompensationSnapshot } from './compensation';
import {
  buildPayComparison,
  describeRole,
  formatDeltaAmount,
  formatDeltaPercent,
  formatPayValue,
  type PayComparison,
  type PayComponentDelta,
  type PayGrowthSummary,
} from './payGrowth';

interface Props {
  open: boolean;
  onClose: () => void;
  summary: PayGrowthSummary;
  getSnapshot: (exp: Experience) => ExperienceCompensationSnapshot | null;
}

const toneFor = (delta: PayComponentDelta) => {
  if (delta.kind === 'flat') return 'text-slate-500 dark:text-ink-400';
  return delta.amount > 0
    ? 'text-emerald-600 dark:text-emerald-300'
    : 'text-rose-600 dark:text-rose-300';
};

const MIXED_HINT =
  'Different pay types — an hourly role’s total covers only the time it ran, so it is not a like-for-like annual figure.';

const AttributeTable: React.FC<{ comparison: PayComparison }> = ({ comparison }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08]">
    {comparison.attributes.map((attribute, index) => (
      <div
        key={attribute.key}
        className={`grid grid-cols-[1.2fr_1fr_1fr_1.3fr] items-center gap-2 px-4 py-2.5 text-[13px] ${
          index > 0 ? 'border-t border-slate-100 dark:border-white/[0.07]' : ''
        }`}
      >
        <span className="text-slate-600 dark:text-ink-200">{attribute.label}</span>
        <span
          className="truncate text-right text-slate-900 dark:text-ink-50"
          title={attribute.current ?? undefined}
        >
          {attribute.current ?? <span className="text-slate-300 dark:text-ink-600">Not set</span>}
        </span>
        <span
          className="truncate text-right text-slate-500 dark:text-ink-400"
          title={attribute.previous ?? undefined}
        >
          {attribute.previous ?? <span className="text-slate-300 dark:text-ink-600">Not set</span>}
        </span>
        <span className="text-right">
          {attribute.changed ? (
            <span className="rounded-full border border-sky-200 dark:border-sky-500/25 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
              Changed
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-ink-500">Same</span>
          )}
        </span>
      </div>
    ))}
  </div>
);

const DeltaTable: React.FC<{ comparison: PayComparison }> = ({ comparison }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08]">
    <div className="grid grid-cols-[1.2fr_1fr_1fr_1.3fr] gap-2 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-ink-500">
      <span>Component</span>
      <span className="text-right">Current</span>
      <span className="text-right">Previous</span>
      <span className="text-right">Change</span>
    </div>
    {comparison.components.map((delta) => (
      <div
        key={delta.key}
        className={`grid grid-cols-[1.2fr_1fr_1fr_1.3fr] items-center gap-2 px-4 py-2.5 text-[13px] ${
          delta.key === 'total'
            ? 'border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-ink-900/60 font-semibold'
            : ''
        }`}
      >
        <span className="text-slate-600 dark:text-ink-200">{delta.label}</span>
        <span className="text-right text-slate-900 dark:text-ink-50">
          {formatPayValue(delta, 'current')}
        </span>
        <span className="text-right text-slate-500 dark:text-ink-400">
          {formatPayValue(delta, 'previous')}
        </span>
        <span className={`text-right ${toneFor(delta)}`}>
          {delta.kind === 'flat' ? (
            <span className="text-slate-400 dark:text-ink-500">No change</span>
          ) : (
            <>
              <span>{formatDeltaAmount(delta)}</span>
              <span className="ml-2 font-semibold">{formatDeltaPercent(delta)}</span>
            </>
          )}
        </span>
      </div>
    ))}
  </div>
);

const PayGrowthModal: React.FC<Props> = ({ open, onClose, summary, getSnapshot }) => {
  const { defaultComparison, comparableRoles } = summary;

  const [currentId, setCurrentId] = useState<number | null>(null);
  const [previousId, setPreviousId] = useState<number | null>(null);

  // Reset to the default pair each time the modal opens so it always reflects the list.
  useEffect(() => {
    if (!open) return;
    setCurrentId(defaultComparison?.currentExp.id ?? comparableRoles[0]?.id ?? null);
    setPreviousId(defaultComparison?.previousExp.id ?? comparableRoles[1]?.id ?? null);
  }, [open, defaultComparison, comparableRoles]);

  const options = useMemo(
    () =>
      comparableRoles.map((exp) => ({
        value: exp.id!,
        title: describeRole(exp),
        isHourly: getSnapshot(exp)?.kind === 'hourly',
      })),
    [comparableRoles, getSnapshot]
  );

  const comparison = useMemo(() => {
    const currentExp = comparableRoles.find((exp) => exp.id === currentId);
    const previousExp = comparableRoles.find((exp) => exp.id === previousId);
    if (!currentExp || !previousExp || currentExp.id === previousExp.id) return null;
    return buildPayComparison(currentExp, previousExp, getSnapshot);
  }, [comparableRoles, currentId, previousId, getSnapshot]);

  const swapSides = () => {
    setCurrentId(previousId);
    setPreviousId(currentId);
  };

  const renderSelect = (
    label: string,
    value: number | null,
    onChange: (id: number) => void,
    disabledId: number | null
  ) => (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-ink-500">
        {label}
      </div>
      <Select
        value={value ?? undefined}
        onChange={onChange}
        className="w-full"
        placeholder="Select a role"
        optionLabelProp="title"
        options={options.map((option) => ({
          value: option.value,
          title: option.title,
          disabled: option.value === disabledId,
          label: (
            <span className="flex items-center justify-between gap-2">
              <span className="truncate">{option.title}</span>
              {option.isHourly && (
                <span className="shrink-0 rounded border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  hourly
                </span>
              )}
            </span>
          ),
        }))}
      />
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={720}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <RiseOutlined className="text-emerald-500 dark:text-emerald-400" />
          <span>
            Pay Growth
            {comparison && (
              <span className={`ml-2 font-semibold ${toneFor(comparison.headline)}`}>
                {formatDeltaPercent(comparison.headline)}
              </span>
            )}
          </span>
        </div>
      }
    >
      <div className="space-y-5 pt-1">
        <div className="flex items-end gap-2">
          {renderSelect('Current', currentId, setCurrentId, previousId)}
          <Tooltip title="Swap sides">
            <button
              type="button"
              onClick={swapSides}
              aria-label="Swap current and previous roles"
              className="mb-0.5 shrink-0 rounded-lg border border-slate-200 dark:border-white/[0.08] p-2 text-slate-400 dark:text-ink-500 transition-colors hover:border-sky-300 hover:text-sky-600"
            >
              <SwapOutlined />
            </button>
          </Tooltip>
          {renderSelect('Previous', previousId, setPreviousId, currentId)}
        </div>

        {comparison?.mode === 'mixed' && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
            {MIXED_HINT}
          </div>
        )}

        {comparison ? (
          <div className="space-y-5">
            <section className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-ink-500">
                Role &amp; level
              </div>
              <AttributeTable comparison={comparison} />
              {comparison.attributes.some((a) => a.key === 'level' && a.changed) &&
                comparison.currentExp.company.trim().toLowerCase() !==
                  comparison.previousExp.company.trim().toLowerCase() && (
                  <div className="text-[11px] leading-relaxed text-slate-400 dark:text-ink-500">
                    Levels at different companies use different scales and are not directly
                    equivalent.
                  </div>
                )}
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-ink-500">
                Compensation
              </div>
              <DeltaTable comparison={comparison} />
              {comparison.notes.length > 0 && (
                <div className="space-y-1 rounded-lg bg-slate-50 dark:bg-ink-900 px-3 py-2.5">
                  {comparison.notes.map((note) => (
                    <div
                      key={note.exp.id}
                      className="text-[11px] leading-relaxed text-slate-500 dark:text-ink-400"
                    >
                      <span className="font-medium text-slate-600 dark:text-ink-200">
                        {note.exp.company}
                      </span>{' '}
                      {note.text}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] px-4 py-8 text-center text-[13px] text-slate-500 dark:text-ink-400">
            {comparableRoles.length < 2
              ? 'Add pay data to at least two roles to compare them.'
              : 'Pick two different roles to compare.'}
          </div>
        )}
      </div>
    </Modal>
  );
};

export const PayGrowthArrow: React.FC<{ delta: PayComponentDelta }> = ({ delta }) =>
  delta.amount > 0 ? (
    <ArrowUpOutlined className="text-[10px]" />
  ) : delta.amount < 0 ? (
    <ArrowDownOutlined className="text-[10px]" />
  ) : null;

export default PayGrowthModal;
