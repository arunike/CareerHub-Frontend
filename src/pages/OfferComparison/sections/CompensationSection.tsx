type CompensationSectionProps = {
  baseSalary: number;
  onBaseSalaryChange: (value: number) => void;
  bonus: number;
  onBonusChange: (value: number) => void;
  bonusMode: '$' | '%';
  setBonusMode: (value: '$' | '%') => void;
  bonusPercentInput: string;
  setBonusPercentInput: (value: string) => void;
  equity: number;
  onEquityChange: (value: number) => void;
  equityMode: 'annual' | 'total';
  setEquityMode: (value: 'annual' | 'total') => void;
  equityTotalGrantInput: string;
  setEquityTotalGrantInput: (value: string) => void;
  onEquityTotalGrantChange?: (value: number) => void;
  effectiveEquityVestingPercent: number;
  setEquityVestingPercentInternal: (value: number) => void;
  onEquityVestingPercentChange?: (value: number) => void;
  signOn: number;
  onSignOnChange: (value: number) => void;
  enableCompModeToggles: boolean;
};

const CompensationSection = ({
  baseSalary,
  onBaseSalaryChange,
  bonus,
  onBonusChange,
  bonusMode,
  setBonusMode,
  bonusPercentInput,
  setBonusPercentInput,
  equity,
  onEquityChange,
  equityMode,
  setEquityMode,
  equityTotalGrantInput,
  setEquityTotalGrantInput,
  onEquityTotalGrantChange,
  effectiveEquityVestingPercent,
  setEquityVestingPercentInternal,
  onEquityVestingPercentChange,
  signOn,
  onSignOnChange,
  enableCompModeToggles,
}: CompensationSectionProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
        <input
          type="number"
          value={baseSalary}
          onChange={(e) => {
            const nextBase = Number(e.target.value) || 0;
            onBaseSalaryChange(nextBase);
            if (enableCompModeToggles && bonusMode === '%') {
              const pct = Number(bonusPercentInput) || 0;
              onBonusChange((pct / 100) * nextBase);
            }
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">Bonus</label>
          {enableCompModeToggles && (
            <button
              type="button"
              onClick={() => {
                if (bonusMode === '$') {
                  const pct = baseSalary > 0 ? (Number(bonus || 0) / Number(baseSalary)) * 100 : 0;
                  setBonusPercentInput(pct.toFixed(2).replace(/\.00$/, ''));
                  setBonusMode('%');
                } else {
                  setBonusMode('$');
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Use {bonusMode === '$' ? '%' : '$'}
            </button>
          )}
        </div>
        {enableCompModeToggles && bonusMode === '%' ? (
          <div>
            <div className="relative">
              <input
                type="number"
                value={bonusPercentInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setBonusPercentInput(next);
                  const pct = Number(next) || 0;
                  onBonusChange((pct / 100) * Number(baseSalary || 0));
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm"
                placeholder="%"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">≈ ${Math.round(bonus || 0).toLocaleString()}</p>
          </div>
        ) : (
          <input
            type="number"
            value={bonus}
            onChange={(e) => onBonusChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        )}
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">Equity</label>
          {enableCompModeToggles && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (equityMode !== 'total') {
                    const total =
                      effectiveEquityVestingPercent > 0
                        ? Number(equity || 0) / (Number(effectiveEquityVestingPercent) / 100)
                        : 0;
                    setEquityTotalGrantInput(total.toFixed(0));
                    onEquityTotalGrantChange?.(total);
                  }
                  setEquityMode('total');
                }}
                className={equityMode === 'total' ? 'text-blue-700 underline font-semibold' : 'text-gray-500 underline'}
              >
                Total
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setEquityMode('annual')}
                className={equityMode === 'annual' ? 'text-blue-700 underline font-semibold' : 'text-gray-500 underline'}
              >
                /Yr
              </button>
            </div>
          )}
        </div>
        {enableCompModeToggles && equityMode === 'total' ? (
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <input
              type="number"
              value={equityTotalGrantInput}
              onChange={(e) => {
                const next = e.target.value;
                setEquityTotalGrantInput(next);
                const total = Number(next) || 0;
                onEquityTotalGrantChange?.(total);
                const annual = total * ((Number(effectiveEquityVestingPercent) || 0) / 100);
                onEquityChange(annual);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Total grant"
            />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={effectiveEquityVestingPercent}
                onChange={(e) => {
                  const pct = Number(e.target.value) || 0;
                  setEquityVestingPercentInternal(pct);
                  onEquityVestingPercentChange?.(pct);
                  const total = Number(equityTotalGrantInput) || 0;
                  onEquityChange(total * (pct / 100));
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-7 text-sm"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
            </div>
            <p className="col-span-2 text-xs text-gray-500">≈ ${Math.round(equity || 0).toLocaleString()} / yr</p>
          </div>
        ) : (
          <input
            type="number"
            value={equity}
            onChange={(e) => onEquityChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Annual value"
          />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sign-On</label>
        <input
          type="number"
          value={signOn}
          onChange={(e) => onSignOnChange(Number(e.target.value) || 0)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
};

export default CompensationSection;
