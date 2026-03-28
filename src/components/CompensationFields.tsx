import React, { useEffect, useState } from 'react';

export interface CompValue {
  base_salary: number | null;
  bonus: number | null;
  equity: number | null;
}

interface Props {
  value?: CompValue;
  onChange?: (v: CompValue) => void;
  equityVestingPercent?: number;
  onEquityVestingPercentChange?: (v: number) => void;
}

type BonusMode = '$' | '%';
type EquityMode = 'annual' | 'total';

const num = (v: number | null | undefined) => (v == null ? '' : String(v));

const CompensationFields: React.FC<Props> = ({
  value,
  onChange,
  equityVestingPercent,
  onEquityVestingPercentChange,
}) => {
  const base = value?.base_salary ?? null;
  const bonus = value?.bonus ?? null;
  const equity = value?.equity ?? null;

  const [bonusMode, setBonusMode] = useState<BonusMode>('$');
  const [bonusPct, setBonusPct] = useState('');
  const [equityMode, setEquityMode] = useState<EquityMode>('annual');
  const [equityTotal, setEquityTotal] = useState('');
  const [vestingPct, setVestingPct] = useState(equityVestingPercent ?? 25);

  // Sync external vesting percent
  useEffect(() => {
    if (equityVestingPercent != null) setVestingPct(equityVestingPercent);
  }, [equityVestingPercent]);

  // When value changes externally (e.g. auto-fill from offer), keep % inputs consistent
  useEffect(() => {
    if (bonusMode === '%' && base != null && base > 0 && bonus != null) {
      setBonusPct(((bonus / base) * 100).toFixed(2).replace(/\.00$/, ''));
    }
    if (equityMode === 'total' && equity != null && vestingPct > 0) {
      setEquityTotal(String(Math.round(equity / (vestingPct / 100))));
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
      const total = vestingPct > 0 ? Math.round((equity ?? 0) / (vestingPct / 100)) : 0;
      setEquityTotal(String(total));
    }
    setEquityMode(mode);
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition';

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
            <div className="grid grid-cols-[1fr_72px] gap-1.5">
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
                    emit({ equity: Math.round((Number(total) || 0) * (vestingPct / 100)) });
                  }}
                  placeholder="Total grant"
                  className={`${inputCls} pl-6`}
                />
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={vestingPct}
                  onChange={e => {
                    const pct = Number(e.target.value) || 0;
                    setVestingPct(pct);
                    onEquityVestingPercentChange?.(pct);
                    emit({ equity: Math.round((Number(equityTotal) || 0) * (pct / 100)) });
                  }}
                  className={`${inputCls} pr-6`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
              </div>
            </div>
            {equity != null && (
              <p className="text-[11px] text-gray-400">≈ ${Math.round(equity).toLocaleString()} / yr</p>
            )}
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
