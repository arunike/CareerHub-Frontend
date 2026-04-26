import CompensationFields from '../../../components/CompensationFields';

type CompensationSectionProps = {
  baseSalary: number;
  onBaseSalaryChange: (value: number) => void;
  bonus: number;
  onBonusChange: (value: number) => void;
  equity: number;
  onEquityChange: (value: number) => void;
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
};

const CompensationSection = ({
  baseSalary,
  onBaseSalaryChange,
  bonus,
  onBonusChange,
  equity,
  onEquityChange,
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
}: CompensationSectionProps) => {
  return (
    <div className="space-y-3">
      <CompensationFields
        value={{ base_salary: baseSalary, bonus, equity }}
        onChange={v => {
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
        onEquityVestingPercentChange={v => {
          setEquityVestingPercentInternal(v);
          onEquityVestingPercentChange?.(v);
        }}
      />
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Sign-On
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={signOn}
            onChange={e => onSignOnChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
          />
        </div>
      </div>
    </div>
  );
};

export default CompensationSection;
