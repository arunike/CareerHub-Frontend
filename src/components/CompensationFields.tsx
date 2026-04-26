import React, { useEffect, useState } from 'react';
import { Popover } from 'antd';

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
}

type BonusMode = '$' | '%';
type EquityMode = 'annual' | 'total';

const num = (v: number | null | undefined) => (v == null ? '' : String(v));
const formatPct = (value: number) =>
  Number(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
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

  // Sync external vesting percent
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

  // When value changes externally (e.g. auto-fill from offer), keep % inputs consistent
  useEffect(() => {
    if (bonusMode === '%' && base != null && base > 0 && bonus != null) {
      setBonusPct(((bonus / base) * 100).toFixed(2).replace(/\.00$/, ''));
    }
    if (equityMode === 'total' && equity != null && vestingPct > 0 && !(equityTotalGrant && equityTotalGrant > 0)) {
      const total = Math.round(equity / (vestingPct / 100));
      setEquityTotal(String(total));
      onEquityTotalGrantChange?.(total);
    }
  }, [base, bonus, equity]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (patch: Partial<CompValue>) =>
    onChange?.({ base_salary: base, bonus, equity, ...patch });

  const handleBaseChange = (raw: string) => {
    const next = raw === '' ? null : Number(raw);
    // Recalculate bonus if in % mode
    const nextBonus =
      bonusMode === '%' && next != null
        ? ((Number(bonusPct) || 0) / 100) * next
        : bonus;
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
  const yearOneEquity = Math.round((Number(equityTotal) || 0) * ((Number(vestingSchedule[0]) || 0) / 100));
  const resetVestingToFull = () => {
    const next = defaultSchedule(Number(vestingSchedule[0]) || vestingPct || 25);
    setVestingSchedule(next);
    emitEquityFromTotal(Number(equityTotal) || 0, next);
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition';
  const vestingEditor = (
    <div className="w-[320px] max-w-[calc(100vw-48px)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Vesting schedule</div>
          <div className="mt-0.5 text-xs text-gray-400">Total {formatPct(vestingTotalPct)}%</div>
        </div>
        {Math.round(vestingTotalPct * 100) !== 10000 && (
          <button
            type="button"
            onClick={resetVestingToFull}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Reset 100%
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {vestingSchedule.map((pct, index) => (
          <label key={index} className="flex min-w-0 items-center gap-2">
            <span className="w-7 shrink-0 text-xs font-bold uppercase tracking-wide text-gray-500">
              Y{index + 1}
            </span>
            <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-white px-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <input
                type="text"
                inputMode="decimal"
                value={formatPct(pct)}
                onChange={e => updateVestingSchedule(index, e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-right text-sm font-semibold tabular-nums text-gray-900 focus:outline-none"
              />
              <span className="shrink-0 pl-1 text-sm font-medium text-gray-400">%</span>
            </div>
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <span className="text-xs text-gray-400">Year 1: ${yearOneEquity.toLocaleString()}</span>
        <button
          type="button"
          onClick={() => setIsVestingOpen(false)}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Base Salary */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Base Salary
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={num(base)}
            onChange={e => handleBaseChange(e.target.value)}
            placeholder="e.g. 150000"
            className={`${inputCls} pl-6`}
          />
        </div>
      </div>

      {/* Bonus */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Bonus
          </label>
          <button
            type="button"
            onClick={handleBonusToggle}
            className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
          >
            {bonusMode === '$' ? '% of base' : '$ amount'}
          </button>
        </div>
        {bonusMode === '%' ? (
          <div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.5}
                value={bonusPct}
                onChange={e => {
                  const pct = e.target.value;
                  setBonusPct(pct);
                  emit({ bonus: ((Number(pct) || 0) / 100) * (base ?? 0) });
                }}
                placeholder="e.g. 15"
                className={`${inputCls} pr-7`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
            </div>
            {bonus != null && (
              <p className="text-[11px] text-gray-400 mt-1">≈ ${Math.round(bonus).toLocaleString()}</p>
            )}
          </div>
        ) : (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={num(bonus)}
              onChange={e => emit({ bonus: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="e.g. 20000"
              className={`${inputCls} pl-6`}
            />
          </div>
        )}
      </div>

      {/* Equity / RSU */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Equity / RSU
          </label>
          <div className="flex items-center gap-1 text-[10px] font-medium">
            <button
              type="button"
              onClick={() => handleEquityToggle('annual')}
              className={equityMode === 'annual' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
            >
              /yr
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => handleEquityToggle('total')}
              className={equityMode === 'total' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
            >
              total
            </button>
          </div>
        </div>
        {equityMode === 'total' ? (
          <div className="space-y-1.5">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={10000}
                value={equityTotal}
                onChange={e => {
                  const total = e.target.value;
                  setEquityTotal(total);
                  emitEquityFromTotal(Number(total) || 0, vestingSchedule);
                }}
                placeholder="Total grant"
                className={`${inputCls} pl-6`}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[11px] leading-5 text-gray-400">
                {formatPct(vestingTotalPct)}% vested · Y1 ${yearOneEquity.toLocaleString()}
              </p>
              <Popover
                trigger="click"
                placement="bottomRight"
                open={isVestingOpen}
                onOpenChange={setIsVestingOpen}
                content={vestingEditor}
              >
                <button
                  type="button"
                  className="shrink-0 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                >
                  Configure
                </button>
              </Popover>
            </div>
          </div>
        ) : (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={num(equity)}
              onChange={e => emit({ equity: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="Annual value"
              className={`${inputCls} pl-6`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CompensationFields;
