const MAX_YEARS = 4;
const DEFAULT_YEARS = 2;

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

// Two rows by default, because a sign-on split beyond year 2 is rare; the rest are added
// on demand rather than sitting there empty.
const normalise = (schedule: number[], total: number) => {
  const rows = schedule.length > 0 ? schedule.map((value) => Number(value) || 0) : [total, 0];
  while (rows.length < DEFAULT_YEARS) rows.push(0);
  return rows.slice(0, MAX_YEARS);
};

interface Props {
  total: number;
  schedule: number[];
  onChange: (schedule: number[]) => void;
}

const SignOnScheduleEditor = ({ total, schedule, onChange }: Props) => {
  const rows = normalise(schedule, total);
  const allocated = rows.reduce((sum, value) => sum + value, 0);
  const remainder = total - allocated;

  const setYear = (index: number, raw: string) => {
    const next = [...rows];
    next[index] = Math.max(0, Number(raw.replace(/[^0-9.]/g, '')) || 0);
    onChange(next);
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Payout by year
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            Allocated {money(allocated)} of {money(total)}
          </div>
        </div>
        {Math.round(remainder) !== 0 && (
          <button
            type="button"
            onClick={() => onChange([total, ...rows.slice(1).map(() => 0)])}
            className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            All in Y1
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((amount, index) => (
          <label key={index} className="flex min-w-0 items-center gap-2">
            <span className="w-7 shrink-0 text-xs font-bold uppercase tracking-wide text-gray-500">
              Y{index + 1}
            </span>
            <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-white px-2 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <span className="shrink-0 pr-1 text-sm font-medium text-gray-400">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount === 0 ? '' : amount}
                placeholder="0"
                onChange={(event) => setYear(index, event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-right text-sm font-semibold tabular-nums text-gray-900 focus:outline-none"
              />
            </div>
          </label>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <span
          className={`text-xs ${Math.round(remainder) === 0 ? 'text-gray-400' : 'text-amber-600'}`}
        >
          {Math.round(remainder) === 0
            ? 'Matches the sign-on total'
            : `${money(Math.abs(remainder))} ${remainder > 0 ? 'unallocated' : 'over the total'}`}
        </span>
        {rows.length < MAX_YEARS && (
          <button
            type="button"
            onClick={() => onChange([...rows, 0])}
            className="min-h-11 rounded-lg px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            + Year {rows.length + 1}
          </button>
        )}
      </div>
    </div>
  );
};

export default SignOnScheduleEditor;
