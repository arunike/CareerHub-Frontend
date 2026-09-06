import React, { useEffect, useState } from 'react';
import { Popover } from 'antd';
import ModeToggle from './ModeToggle';
import UnitNumberInput from './UnitNumberInput';
import {
  CONTROL_CLASS,
  FIELD_HEADER_CLASS,
  FIELD_HINT_CLASS,
  FIELD_LABEL_CLASS,
} from './formControls';

export interface CompValue {
  base_salary: number | null;
  bonus: number | null;
  equity: number | null;
}

interface Props {
  value?: CompValue;
  onChange?: (v: CompValue) => void;
  equityTotalGrant?: number;
  onEquityTotalGrantChange?: (v: number) => void;
  equityVestingPercent?: number;
  onEquityVestingPercentChange?: (v: number) => void;
  equityVestingSchedule?: number[];
  onEquityVestingScheduleChange?: (v: number[]) => void;
  defaultEquityMode?: EquityMode;
  // Lives in the equity popover, with the grant it modifies.
  showEquityRefresh?: boolean;
  annualRefreshValue?: number;
  onAnnualRefreshValueChange?: (v: number) => void;
  refreshStartsYear?: number;
  onRefreshStartsYearChange?: (v: number) => void;
}

type BonusMode = '$' | '%';
type EquityMode = 'annual' | 'total';

const formatPct = (value: number) =>
  Number(value)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
const defaultSchedule = (firstYearPct: number) => {
  const y1 = Math.min(100, Math.max(0, Number(firstYearPct) || 25));
  const remaining = Math.max(0, 100 - y1);
  const y2 = Math.round((remaining / 3) * 100) / 100;
  const y3 = y2;
  const y4 = Math.round((100 - y1 - y2 - y3) * 100) / 100;
  return [y1, y2, y3, y4];
};
const normalizeSchedule = (schedule: number[] | undefined, fallbackPct: number) => {
  if (!Array.isArray(schedule) || schedule.length === 0) return defaultSchedule(fallbackPct);
  const normalized = Array.from({ length: 4 }, (_, index) => {
    const value = Number(schedule?.[index]);
    return Number.isFinite(value) ? value : 0;
  });
  return normalized.some((value) => value > 0) ? normalized : defaultSchedule(fallbackPct);
};

const CompensationFields: React.FC<Props> = ({
  value,
  onChange,
  equityTotalGrant,
  onEquityTotalGrantChange,
  equityVestingPercent,
  onEquityVestingPercentChange,
  equityVestingSchedule,
  onEquityVestingScheduleChange,
  defaultEquityMode = 'annual',
  showEquityRefresh = false,
  annualRefreshValue = 0,
  onAnnualRefreshValueChange,
  refreshStartsYear = 2,
  onRefreshStartsYearChange,
}) => {
  const base = value?.base_salary ?? null;
  const bonus = value?.bonus ?? null;
  const equity = value?.equity ?? null;

  const [bonusMode, setBonusMode] = useState<BonusMode>('$');
  const [bonusPct, setBonusPct] = useState('');
  const [equityMode, setEquityMode] = useState<EquityMode>(defaultEquityMode);
  const [equityTotal, setEquityTotal] = useState('');
  const [vestingPct, setVestingPct] = useState(equityVestingPercent ?? 25);
  const [vestingSchedule, setVestingSchedule] = useState<number[]>(
    normalizeSchedule(equityVestingSchedule, equityVestingPercent ?? 25)
  );
  const [isVestingOpen, setIsVestingOpen] = useState(false);

  useEffect(() => {
    if (equityVestingPercent != null) setVestingPct(equityVestingPercent);
  }, [equityVestingPercent]);

  useEffect(() => {
    setVestingSchedule(normalizeSchedule(equityVestingSchedule, equityVestingPercent ?? 25));
  }, [equityVestingSchedule, equityVestingPercent]);

  useEffect(() => {
    if (equityTotalGrant != null && equityTotalGrant > 0) {
      setEquityTotal(String(Math.round(equityTotalGrant)));
    }
  }, [equityTotalGrant]);

  useEffect(() => {
    if (bonusMode === '%' && base != null && base > 0 && bonus != null) {
      setBonusPct(((bonus / base) * 100).toFixed(2).replace(/\.00$/, ''));
    }
    if (
      equityMode === 'total' &&
      equity != null &&
      vestingPct > 0 &&
      !(equityTotalGrant && equityTotalGrant > 0)
    ) {
      const total = Math.round(equity / (vestingPct / 100));
      setEquityTotal(String(total));
      onEquityTotalGrantChange?.(total);
    }
  }, [base, bonus, equity]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (patch: Partial<CompValue>) =>
    onChange?.({ base_salary: base, bonus, equity, ...patch });

  const handleBaseChange = (raw: string) => {
    const next = raw === '' ? null : Number(raw);
    const nextBonus =
      bonusMode === '%' && next != null ? ((Number(bonusPct) || 0) / 100) * next : bonus;
    onChange?.({ base_salary: next, bonus: nextBonus, equity });
  };

  const handleBonusToggle = () => {
    if (bonusMode === '$') {
      const pct = base && base > 0 ? ((bonus ?? 0) / base) * 100 : 0;
      setBonusPct(pct.toFixed(2).replace(/\.00$/, ''));
      setBonusMode('%');
    } else {
      setBonusMode('$');
    }
  };

  const handleEquityToggle = (mode: EquityMode) => {
    if (mode === 'total' && equityMode !== 'total') {
      const total =
        equityTotalGrant && equityTotalGrant > 0
          ? Math.round(equityTotalGrant)
          : vestingPct > 0
            ? Math.round((equity ?? 0) / (vestingPct / 100))
            : 0;
      setEquityTotal(String(total));
      onEquityTotalGrantChange?.(total);
    }
    setEquityMode(mode);
  };

  const emitEquityFromTotal = (total: number, schedule: number[]) => {
    const yearOnePct = Number(schedule[0]) || 0;
    setVestingPct(yearOnePct);
    onEquityTotalGrantChange?.(total);
    onEquityVestingPercentChange?.(yearOnePct);
    onEquityVestingScheduleChange?.(schedule);
    emit({ equity: Math.round(total * (yearOnePct / 100)) });
  };

  const updateVestingSchedule = (index: number, raw: string) => {
    const next = [...vestingSchedule];
    next[index] = raw === '' ? 0 : Number(raw);
    setVestingSchedule(next);
    emitEquityFromTotal(Number(equityTotal) || 0, next);
  };

  const vestingTotalPct = vestingSchedule.reduce((sum, pct) => sum + (Number(pct) || 0), 0);
  const yearOneEquity = Math.round(
    (Number(equityTotal) || 0) * ((Number(vestingSchedule[0]) || 0) / 100)
  );
  const resetVestingToFull = () => {
    const next = defaultSchedule(Number(vestingSchedule[0]) || vestingPct || 25);
    setVestingSchedule(next);
    emitEquityFromTotal(Number(equityTotal) || 0, next);
  };

  const vestingEditor = (
    <div className="w-[340px] max-w-[calc(100vw-48px)] space-y-4">
      {equityMode === 'total' && (
        <div>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className={FIELD_LABEL_CLASS}>Vesting schedule</div>
              <div className="mt-0.5 text-[11px] text-gray-400 dark:text-ink-500">
                Total {formatPct(vestingTotalPct)}% · Y1 ${yearOneEquity.toLocaleString()}
              </div>
            </div>
            {Math.round(vestingTotalPct * 100) !== 10000 && (
              <button
                type="button"
                onClick={resetVestingToFull}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300 hover:bg-blue-50"
              >
                Reset 100%
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {vestingSchedule.map((pct, index) => (
              <label key={index} className="flex min-w-0 items-center gap-2">
                <span className="w-6 shrink-0 text-[11px] font-bold uppercase text-gray-500 dark:text-ink-400">
                  Y{index + 1}
                </span>
                <UnitNumberInput
                  unit="%"
                  min={0}
                  max={100}
                  value={pct || null}
                  onChange={(next) => updateVestingSchedule(index, String(next ?? 0))}
                  className="min-w-0 flex-1"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {showEquityRefresh && (
        <div
          className={
            equityMode === 'total'
              ? 'border-t border-gray-100 dark:border-white/[0.07] pt-3'
              : undefined
          }
        >
          <div className={FIELD_LABEL_CLASS}>Annual refresh</div>
          <p className="mt-0.5 mb-2 text-[11px] leading-4 text-gray-400 dark:text-ink-500">
            A new grant each year, vesting evenly over four years so they stack. Leave at 0 to model
            the initial grant only.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-semibold uppercase text-gray-400 dark:text-ink-500">
                Grant value
              </span>
              <UnitNumberInput
                unit="$"
                min={0}
                value={annualRefreshValue || null}
                placeholder="0"
                onChange={(next) => onAnnualRefreshValueChange?.(next ?? 0)}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-semibold uppercase text-gray-400 dark:text-ink-500">
                Starts
              </span>
              <select
                value={refreshStartsYear}
                disabled={annualRefreshValue <= 0}
                onChange={(event) => onRefreshStartsYearChange?.(Number(event.target.value) || 2)}
                className={CONTROL_CLASS}
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end border-t border-gray-100 dark:border-white/[0.07] pt-2">
        <button
          type="button"
          onClick={() => setIsVestingOpen(false)}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 dark:text-ink-400 hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </div>
  );

  const equityHint =
    equityMode === 'total'
      ? `Schedule ${formatPct(vestingTotalPct)}% · Y1 $${yearOneEquity.toLocaleString()}`
      : annualRefreshValue > 0
        ? `Refresh $${Math.round(annualRefreshValue).toLocaleString()}/yr from Y${refreshStartsYear}`
        : 'Vesting & refresh';

  const showConfigure = equityMode === 'total' || showEquityRefresh;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
      {/* Base Salary */}
      <div className="min-w-0">
        <div className={FIELD_HEADER_CLASS}>
          <label className={FIELD_LABEL_CLASS}>Base Salary</label>
        </div>
        <UnitNumberInput
          unit="$"
          min={0}
          step={1000}
          value={base ?? null}
          onChange={(value) => handleBaseChange(value == null ? '' : String(value))}
          placeholder="e.g. 150000"
        />
        <div className={FIELD_HINT_CLASS} />
      </div>

      {/* Bonus */}
      <div className="min-w-0">
        <div className={FIELD_HEADER_CLASS}>
          <label className={FIELD_LABEL_CLASS}>Bonus</label>
          <ModeToggle
            value={bonusMode}
            onChange={(next) => next !== bonusMode && handleBonusToggle()}
            options={[
              { label: '$', value: '$' },
              { label: '% of base', value: '%' },
            ]}
          />
        </div>
        {bonusMode === '%' ? (
          <UnitNumberInput
            unit="%"
            min={0}
            step={0.5}
            value={bonusPct === '' ? null : Number(bonusPct)}
            onChange={(value) => {
              setBonusPct(value == null ? '' : String(value));
              emit({ bonus: ((value ?? 0) / 100) * (base ?? 0) });
            }}
            placeholder="e.g. 15"
          />
        ) : (
          <UnitNumberInput
            unit="$"
            min={0}
            step={1000}
            value={bonus ?? null}
            onChange={(value) => emit({ bonus: value })}
            placeholder="e.g. 20000"
          />
        )}
        <div className={`${FIELD_HINT_CLASS} text-gray-400 dark:text-ink-500`}>
          {bonusMode === '%' && bonus != null && (
            <span className="truncate">= ${Math.round(bonus).toLocaleString()}/yr</span>
          )}
        </div>
      </div>

      {/* Equity / RSU */}
      <div className="min-w-0">
        <div className={FIELD_HEADER_CLASS}>
          <label className={FIELD_LABEL_CLASS}>Equity / RSU</label>
          <ModeToggle
            value={equityMode}
            onChange={(next) => handleEquityToggle(next as EquityMode)}
            options={[
              { label: '/yr', value: 'annual' },
              { label: 'total', value: 'total' },
            ]}
          />
        </div>
        {equityMode === 'total' ? (
          <UnitNumberInput
            unit="$"
            min={0}
            step={10000}
            value={equityTotal === '' ? null : Number(equityTotal)}
            onChange={(value) => {
              setEquityTotal(value == null ? '' : String(value));
              emitEquityFromTotal(value ?? 0, vestingSchedule);
            }}
            placeholder="Total grant"
          />
        ) : (
          <UnitNumberInput
            unit="$"
            min={0}
            step={1000}
            value={equity ?? null}
            onChange={(value) => emit({ equity: value })}
            placeholder="Annual value"
          />
        )}
        <div className={`${FIELD_HINT_CLASS} text-gray-400 dark:text-ink-500`}>
          {showConfigure ? (
            <>
              <span className="min-w-0 truncate">{equityHint}</span>
              <Popover
                trigger="click"
                placement="bottomRight"
                open={isVestingOpen}
                onOpenChange={setIsVestingOpen}
                content={vestingEditor}
              >
                <button
                  type="button"
                  className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-blue-600 dark:text-blue-300 hover:bg-blue-50"
                >
                  Configure
                </button>
              </Popover>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CompensationFields;
