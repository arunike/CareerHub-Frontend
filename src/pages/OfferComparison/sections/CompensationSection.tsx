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
  equityTicker?: string;
  onEquityTickerChange?: (value: string) => void;
  equityShares?: number | null;
  onEquitySharesChange?: (value: number | null) => void;
  equityGrantPrice?: number | null;
  onEquityGrantPriceChange?: (value: number | null) => void;
  currentSharePrice?: number | null;
  onCurrentSharePriceChange?: (value: number | null) => void;
};

const usd = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// A half-percent move is real money on a grant, so it is not rounded away.
const percentLabel = (ratio: number) => {
  const percent = (ratio - 1) * 100;
  return `${Math.abs(percent) < 10 ? percent.toFixed(1) : Math.round(percent)}%`;
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
  equityTicker,
  onEquityTickerChange,
  equityShares,
  onEquitySharesChange,
  equityGrantPrice,
  onEquityGrantPriceChange,
  currentSharePrice,
  onCurrentSharePriceChange,
}: CompensationSectionProps) => {
  const grantValue = Number(equityTotalGrant) || Number(equity) || Number(equityBuybackValue) || 0;
  const shares =
    Number(equityShares) > 0
      ? Number(equityShares)
      : Number(equityGrantPrice) > 0 && grantValue > 0
        ? grantValue / Number(equityGrantPrice)
        : null;
  // Shares win over the recorded grant price, matching priceRatio, so the preview cannot disagree.
  const basisPrice =
    Number(equityGrantPrice) > 0
      ? Number(equityGrantPrice)
      : shares && grantValue > 0
        ? grantValue / shares
        : null;
  const ratio =
    basisPrice && Number(currentSharePrice) > 0 ? Number(currentSharePrice) / basisPrice : null;
  const showPricing = Boolean(onEquityTickerChange) && grantValue > 0;
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

      {showPricing && (
        <div className="rounded-lg border border-slate-200 p-3 dark:border-white/[0.08]">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <label className={FIELD_LABEL_CLASS}>Share pricing</label>
            <span className="text-[11px] text-slate-400 dark:text-ink-500">
              Optional. Revalues this grant at today&rsquo;s price — a private buyback works the
              same way, using its internal price.
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="min-w-0">
              <div className={FIELD_HEADER_CLASS}>
                <label className={FIELD_LABEL_CLASS}>Symbol</label>
              </div>
              <input
                value={equityTicker ?? ''}
                placeholder="GOOG"
                onChange={(event) => onEquityTickerChange?.(event.target.value.toUpperCase())}
                className={CONTROL_CLASS}
              />
              <div className={FIELD_HINT_CLASS} />
            </div>
            <div className="min-w-0">
              <div className={FIELD_HEADER_CLASS}>
                <label className={FIELD_LABEL_CLASS}>Shares</label>
              </div>
              <UnitNumberInput
                min={0}
                value={equityShares ?? null}
                placeholder="0"
                onChange={(value) => onEquitySharesChange?.(value ?? null)}
              />
              <div className={FIELD_HINT_CLASS}>
                {!Number(equityShares) && shares
                  ? `≈ ${Math.round(shares).toLocaleString()} implied`
                  : ''}
              </div>
            </div>
            <div className="min-w-0">
              <div className={FIELD_HEADER_CLASS}>
                <label className={FIELD_LABEL_CLASS}>Grant price</label>
              </div>
              <UnitNumberInput
                unit="$"
                min={0}
                value={equityGrantPrice ?? null}
                placeholder="0"
                onChange={(value) => onEquityGrantPriceChange?.(value ?? null)}
              />
              <div className={FIELD_HINT_CLASS}>
                {!Number(equityGrantPrice) && basisPrice
                  ? `≈ $${basisPrice.toFixed(2)} implied`
                  : ''}
              </div>
            </div>
            <div className="min-w-0">
              <div className={FIELD_HEADER_CLASS}>
                <label className={FIELD_LABEL_CLASS}>Current price</label>
              </div>
              <UnitNumberInput
                unit="$"
                min={0}
                value={currentSharePrice ?? null}
                placeholder="0"
                onChange={(value) => onCurrentSharePriceChange?.(value ?? null)}
              />
              <div className={FIELD_HINT_CLASS}>
                {equityTicker ? `Saved against ${equityTicker}` : 'Needs a symbol'}
              </div>
            </div>
          </div>
          {ratio !== null && ratio !== 1 && (
            <p className="mt-1 text-xs text-slate-600 dark:text-ink-200">
              <span
                className={
                  ratio > 1
                    ? 'font-semibold text-emerald-600 dark:text-emerald-300'
                    : 'font-semibold text-rose-600 dark:text-rose-300'
                }
              >
                {ratio > 1 ? '+' : ''}
                {percentLabel(ratio)}
              </span>{' '}
              at this price:{' '}
              {[
                Number(equity) > 0 ? `${usd(Number(equity) * ratio)} a year` : '',
                Number(equityTotalGrant) > 0
                  ? `${usd(Number(equityTotalGrant) * ratio)} total`
                  : '',
                Number(equityBuybackValue) > 0
                  ? `${usd(Number(equityBuybackValue) * ratio)} buyback`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      )}

      <p className="rounded-lg bg-slate-50 dark:bg-ink-900 px-3 py-2 text-xs leading-5 text-slate-600 dark:text-ink-200">
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
