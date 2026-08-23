import React from 'react';
import UnitNumberInput, { type NumberUnit } from '../../components/UnitNumberInput';

export const EditNotice = ({
  title,
  hint,
  actionLabel,
  onEdit,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onEdit: () => void;
}) => (
  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="mt-1 text-sm text-gray-500 leading-relaxed">{hint}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
      >
        {actionLabel}
      </button>
    </div>
  </div>
);

export const InlineNumberInput = ({
  value,
  onChange,
  unit,
  step,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  unit?: NumberUnit;
  step?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) => (
  <UnitNumberInput
    unit={unit}
    step={step}
    value={value === '' ? null : Number(value)}
    onChange={(next) => onChange(next == null ? '' : String(next))}
    onClick={(event) => event.stopPropagation()}
    onFocus={(event) => event.currentTarget.select()}
    placeholder={placeholder}
    autoFocus={autoFocus}
    size="large"
  />
);

export const MetricSection = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {title}
      </div>
      {hint && <div className="mt-1 text-sm text-gray-500">{hint}</div>}
    </div>
    <div className="divide-y divide-gray-100">{children}</div>
  </div>
);

export const EditableMetricRow = ({
  label,
  value,
  hint,
  editing,
  onActivate,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  editing: boolean;
  onActivate?: () => void;
  children: React.ReactNode;
}) => {
  if (!onActivate) {
    return <MetricRow label={label} value={value} hint={hint} />;
  }

  if (editing) {
    return (
      <div className="py-2.5 first:pt-0 last:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 -mx-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                {label}
              </div>
              <div className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                Editing
              </div>
            </div>
            {hint && <div className="mt-1 text-sm text-gray-500 leading-relaxed">{hint}</div>}
          </div>
          <div className="sm:w-64 mt-2 sm:mt-0">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      className="group w-full py-2.5 text-left transition-colors hover:bg-gray-50/70 outline-none px-2 -mx-2 rounded-lg"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 group-hover:text-gray-600 transition-colors">
            {label}
          </div>
          {hint && <div className="mt-0.5 text-[13px] text-gray-400 leading-relaxed">{hint}</div>}
        </div>
        <div className="shrink-0 flex items-center gap-3 text-left sm:text-right mt-1 sm:mt-0">
          <div className="text-[15px] font-bold text-gray-800">{value}</div>
          <div className="text-[10px] font-semibold text-gray-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded group-hover:bg-blue-50">
            Edit
          </div>
        </div>
      </div>
    </button>
  );
};

export const MetricRow = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="py-2.5 px-2 -mx-2 first:pt-0 last:pb-0">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
          {label}
        </div>
        {hint && <div className="mt-0.5 text-[13px] text-gray-400 leading-relaxed">{hint}</div>}
      </div>
      <div className="shrink-0 text-left sm:text-right mt-1 sm:mt-0 items-center flex">
        <div className="text-[15px] font-bold text-gray-700">{value}</div>
      </div>
    </div>
  </div>
);
