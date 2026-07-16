import CompensationFields from '../../../components/CompensationFields';
import type { EquityLiquidity } from '../equityLiquidity';

type CompensationSectionProps = {
  baseSalary: number;
  onBaseSalaryChange: (value: number) => void;
  bonus: number;
  onBonusChange: (value: number) => void;
  equity: number;
  onEquityChange: (value: number) => void;
  equityLiquidity: EquityLiquidity;
  onEquityLiquidityChange: (value: EquityLiquidity) => void;
  equityBuybackValue: number;
  onEquityBuybackValueChange: (value: number) => void;
  equityTotalGrant?: number;
  onEquityTotalGrantChange?: (value: number) => void;
  effectiveEquityVestingPercent: number;
  setEquityVestingPercentInternal: (value: number) => void;
  onEquityVestingPercentChange?: (value: number) => void;
  equityVestingSchedule?: number[];
  onEquityVestingScheduleChange?: (value: number[]) => void;
  defaultEquityMode?: 'annual' | 'total';
  signOn: number;
  onSignOnChange: (value: number) => void;
  relocationBonus?: number;
  onRelocationBonusChange?: (value: number) => void;
};

const CompensationSection = ({
  baseSalary,
  onBaseSalaryChange,
  bonus,
  onBonusChange,
  equity,
  onEquityChange,
  equityLiquidity,
  onEquityLiquidityChange,
  equityBuybackValue,
  onEquityBuybackValueChange,
  equityTotalGrant,
  onEquityTotalGrantChange,
  effectiveEquityVestingPercent,
  onEquityVestingPercentChange,
  equityVestingSchedule,
  onEquityVestingScheduleChange,
  defaultEquityMode,
  setEquityVestingPercentInternal,
  signOn,
  onSignOnChange,
  relocationBonus,
  onRelocationBonusChange,
}: CompensationSectionProps) => {
  return (
    <div className="space-y-3">
      <CompensationFields
        value={{ base_salary: baseSalary, bonus, equity }}
        onChange={(v) => {
          if (v.base_salary !== baseSalary) onBaseSalaryChange(v.base_salary ?? 0);
          if (v.bonus !== bonus) onBonusChange(v.bonus ?? 0);
          if (v.equity !== equity) onEquityChange(v.equity ?? 0);
        }}
        equityVestingPercent={effectiveEquityVestingPercent}
        equityTotalGrant={equityTotalGrant}
        onEquityTotalGrantChange={onEquityTotalGrantChange}
        equityVestingSchedule={equityVestingSchedule}
        onEquityVestingScheduleChange={onEquityVestingScheduleChange}
        defaultEquityMode={defaultEquityMode}
        onEquityVestingPercentChange={(v) => {
          setEquityVestingPercentInternal(v);
          onEquityVestingPercentChange?.(v);
        }}
      />
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Equity liquidity
            </span>
            <select
              value={equityLiquidity}
              onChange={(event) => onEquityLiquidityChange(event.target.value as EquityLiquidity)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="LIQUID">Public or freely tradable</option>
              <option value="BUYBACK">Private with company buyback</option>
              <option value="ILLIQUID">Private and not currently sellable</option>
            </select>
          </label>

          {equityLiquidity === 'BUYBACK' && (
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Annual buyback value
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={equityBuybackValue}
                  onChange={(event) =>
                    onEquityBuybackValueChange(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-6 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>
          )}
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-600">
          {equityLiquidity === 'LIQUID'
            ? 'The full annual equity value is included in compensation and financial scoring.'
            : equityLiquidity === 'BUYBACK'
              ? `Only the ${equityBuybackValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} annual buyback value is counted.`
              : 'The grant is shown as paper equity, but $0 is counted until it becomes sellable.'}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Sign-On
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <input
              type="number"
              value={signOn}
              onChange={(e) => onSignOnChange(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Relocation / Signing Perks
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <input
              type="number"
              value={relocationBonus || 0}
              onChange={(e) => onRelocationBonusChange?.(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompensationSection;
