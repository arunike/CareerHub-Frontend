import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export const CADENCE_OPTIONS = [
  { value: 52, label: 'Weekly (52)' },
  { value: 26, label: 'Biweekly (26)' },
  { value: 27, label: 'Biweekly, 27-cheque year' },
  { value: 24, label: 'Semi-monthly (24)' },
  { value: 12, label: 'Monthly (12)' },
];

export const SectionLabel = ({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-ink-500">
      {children}
    </span>
    {trailing}
  </div>
);

export const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-ink-200">
      {label}
      {hint ? (
        <Tooltip title={hint}>
          <InfoCircleOutlined className="text-slate-400 dark:text-ink-500" />
        </Tooltip>
      ) : null}
    </span>
    <div className="mt-1.5">{children}</div>
  </label>
);
