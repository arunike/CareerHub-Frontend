import SignOnScheduleEditor from './SignOnScheduleEditor';
import CompensationFields from '../../../components/CompensationFields';
import type { EquityLiquidity } from '../equityLiquidity';
import UnitNumberInput from '../../../components/UnitNumberInput';
import {
  CONTROL_CLASS,
  FIELD_HEADER_CLASS,
  FIELD_HINT_CLASS,
  FIELD_LABEL_CLASS,
} from '../../../components/formControls';

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
  annualRefreshValue?: number;
  onAnnualRefreshValueChange?: (value: number) => void;
  refreshStartsYear?: number;
  onRefreshStartsYearChange?: (value: number) => void;
  onEquityVestingScheduleChange?: (value: number[]) => void;
  defaultEquityMode?: 'annual' | 'total';
  signOn: number;
  onSignOnChange: (value: number) => void;
  signOnSchedule: number[];
  onSignOnScheduleChange: (value: number[]) => void;
  relocationBonus?: number | string;
  onRelocationBonusChange?: (value: number | string) => void;
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
  annualRefreshValue = 0,
  onAnnualRefreshValueChange,
  refreshStartsYear = 2,
  onRefreshStartsYearChange,
  onEquityVestingScheduleChange,
  defaultEquityMode,
  setEquityVestingPercentInternal,
  signOn,
  onSignOnChange,
  signOnSchedule,
  onSignOnScheduleChange,
  relocationBonus,
  onRelocationBonusChange,
}: CompensationSectionProps) => {
  return (
    <div className="space-y-4">
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
        showEquityRefresh={!!onAnnualRefreshValueChange && equityLiquidity === 'LIQUID'}
        annualRefreshValue={annualRefreshValue}
        onAnnualRefreshValueChange={onAnnualRefreshValueChange}
        refreshStartsYear={refreshStartsYear}
        onRefreshStartsYearChange={onRefreshStartsYearChange}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
        <div className="min-w-0">
          <div className={FIELD_HEADER_CLASS}>
            <label className={FIELD_LABEL_CLASS}>Sign-On</label>
          </div>
          <UnitNumberInput
            unit="$"
            min={0}
            value={signOn === 0 ? null : signOn}
            placeholder="0"
            onChange={(value) => onSignOnChange(value ?? 0)}
          />
          {signOn > 0 ? (
            <SignOnScheduleEditor
              total={signOn}
              schedule={signOnSchedule}
              onChange={onSignOnScheduleChange}
            />
          ) : (
            <div className={FIELD_HINT_CLASS} />
          )}
        </div>

        <div className="min-w-0">
          <div className={FIELD_HEADER_CLASS}>
            <label className={FIELD_LABEL_CLASS}>Relocation / Perks</label>
          </div>
          <UnitNumberInput
            unit="$"
            min={0}
            value={Number(relocationBonus) || null}
            placeholder="0"
            onChange={(value) => onRelocationBonusChange?.(value ?? 0)}
          />
          <div className={FIELD_HINT_CLASS} />
        </div>

        <div className="min-w-0">
          <div className={FIELD_HEADER_CLASS}>
            <label className={FIELD_LABEL_CLASS}>Equity liquidity</label>
          </div>
          <select
            value={equityLiquidity}
            onChange={(event) => onEquityLiquidityChange(event.target.value as EquityLiquidity)}
            className={CONTROL_CLASS}
          >
            <option value="LIQUID">Public or freely tradable</option>
            <option value="BUYBACK">Private with company buyback</option>
            <option value="ILLIQUID">Private and not currently sellable</option>
          </select>
          <div className={FIELD_HINT_CLASS} />
        </div>
      </div>

      {equityLiquidity === 'BUYBACK' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
          <div className="min-w-0">
            <div className={FIELD_HEADER_CLASS}>
              <label className={FIELD_LABEL_CLASS}>Annual buyback value</label>
            </div>
            <UnitNumberInput
              unit="$"
              min={0}
              value={equityBuybackValue === 0 ? null : equityBuybackValue}
              placeholder="0"
              onChange={(value) => onEquityBuybackValueChange(value ?? 0)}
            />
          </div>
        </div>
      )}

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        {equityLiquidity === 'LIQUID'
          ? 'The full annual equity value is included in compensation and financial scoring.'
          : equityLiquidity === 'BUYBACK'
            ? `Only the ${equityBuybackValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} annual buyback value is counted.`
            : 'The grant is shown as paper equity, but $0 is counted until it becomes sellable.'}
      </p>
    </div>
  );
};

export default CompensationSection;
