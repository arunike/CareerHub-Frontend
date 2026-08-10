import { useState } from 'react';
import { Popover } from 'antd';
import { DownOutlined, SlidersOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import UnitNumberInput from '../../components/UnitNumberInput';
import { DEFAULT_BASE_GROWTH_PCT, DEFAULT_EQUITY_GROWTH_PCT } from './yearByYear';

// Quick stress-test shortcuts. Any rate in range can be typed instead.
const EQUITY_SHORTCUTS = [
  { label: 'Downside', value: -20 },
  { label: 'Flat', value: 0 },
  { label: 'Upside', value: 25 },
];

const EQUITY_RANGE = { min: -80, max: 300 };
const BASE_RANGE = { min: -20, max: 30 };

const formatSigned = (value: number) => `${value > 0 ? '+' : ''}${value}%`;

const ProjectionAssumptions = ({
  equityGrowthPct,
  baseGrowthPct,
  onEquityGrowthChange,
  onBaseGrowthChange,
}: {
  equityGrowthPct: number;
  baseGrowthPct: number;
  onEquityGrowthChange: (value: number) => void;
  onBaseGrowthChange: (value: number) => void;
}) => {
  const [open, setOpen] = useState(false);

  const isDefault =
    equityGrowthPct === DEFAULT_EQUITY_GROWTH_PCT && baseGrowthPct === DEFAULT_BASE_GROWTH_PCT;

  const reset = () => {
    onEquityGrowthChange(DEFAULT_EQUITY_GROWTH_PCT);
    onBaseGrowthChange(DEFAULT_BASE_GROWTH_PCT);
  };

  const content = (
    <div className="w-[248px] space-y-4">
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          Equity market growth
        </span>
        <div className="mb-2 flex gap-1">
          {EQUITY_SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => onEquityGrowthChange(shortcut.value)}
              className={clsx(
                'flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                equityGrowthPct === shortcut.value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              {shortcut.label}
            </button>
          ))}
        </div>
        <UnitNumberInput
          unit="%"
          value={equityGrowthPct}
          onChange={(value) => onEquityGrowthChange(value ?? 0)}
          min={EQUITY_RANGE.min}
          max={EQUITY_RANGE.max}
          aria-label="Annual equity market growth percentage"
        />
        <p className="mt-1 text-[11px] leading-4 text-slate-400">
          Share price change per year, compounded from year 2.
        </p>
      </div>

      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          Base salary increase
        </span>
        <UnitNumberInput
          unit="%"
          value={baseGrowthPct}
          onChange={(value) => onBaseGrowthChange(value ?? 0)}
          min={BASE_RANGE.min}
          max={BASE_RANGE.max}
          aria-label="Annual base salary increase percentage"
        />
        <p className="mt-1 text-[11px] leading-4 text-slate-400">
          Annual raise applied to base and bonus on every row, current role included.
        </p>
      </div>

      <button
        type="button"
        onClick={reset}
        disabled={isDefault}
        className={clsx(
          'text-[11px] font-medium transition-colors',
          isDefault
            ? 'cursor-default text-slate-300'
            : 'text-indigo-600 hover:text-indigo-700 hover:underline'
        )}
      >
        Reset to defaults
      </button>
    </div>
  );

  return (
    <Popover
      content={content}
      title={<span className="text-sm font-bold text-slate-800">Projection assumptions</span>}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      overlayStyle={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      <button
        type="button"
        className="flex min-h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-600"
        aria-label={`Projection assumptions: equity ${formatSigned(equityGrowthPct)} per year, base ${formatSigned(baseGrowthPct)} per year`}
      >
        <SlidersOutlined className="text-[11px] text-slate-400" />
        <span>Equity {formatSigned(equityGrowthPct)}</span>
        <span className="text-slate-300">·</span>
        <span>Base {formatSigned(baseGrowthPct)}</span>
        <DownOutlined className="text-[9px] text-slate-400" />
      </button>
    </Popover>
  );
};

export default ProjectionAssumptions;
