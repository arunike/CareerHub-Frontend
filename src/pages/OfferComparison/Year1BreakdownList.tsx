type ChartDatum = {
  id?: string;
  name: string;
  Base: number;
  Bonus: number;
  Equity: number;
  SignOn: number;
  Benefits: number;
  Total?: number;
};

const COMPONENTS: { key: keyof ChartDatum; label: string; dot: string }[] = [
  { key: 'Base', label: 'Base', dot: 'bg-blue-600' },
  { key: 'Bonus', label: 'Bonus', dot: 'bg-blue-400' },
  { key: 'Equity', label: 'Equity', dot: 'bg-pink-500' },
  { key: 'SignOn', label: 'Sign-on', dot: 'bg-teal-500' },
  { key: 'Benefits', label: 'Benefits', dot: 'bg-amber-500' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

/** Same year-1 figures as the chart, in a scannable table. */
const Year1BreakdownList = ({ data }: { data: ChartDatum[] }) => {
  if (data.length === 0) return null;

  const rowTotal = (row: ChartDatum) =>
    COMPONENTS.reduce((sum, component) => sum + Number(row[component.key] || 0), 0);

  const maxTotal = Math.max(...data.map(rowTotal), 0);
  const best = data.reduce((a, b) => (rowTotal(b) > rowTotal(a) ? b : a), data[0]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {COMPONENTS.map((component) => (
          <span
            key={component.label}
            className="flex items-center gap-1.5 text-[11px] text-slate-500"
          >
            <span className={`h-2 w-2 rounded-full ${component.dot}`} />
            {component.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4 text-left font-bold">Offer</th>
              {COMPONENTS.map((component) => (
                <th key={component.label} className="px-3 py-2 text-right font-bold">
                  {component.label}
                </th>
              ))}
              <th className="py-2 pl-3 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const total = rowTotal(row);
              const share = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
              const isBest = data.length > 1 && row === best;
              return (
                <tr key={row.id ?? row.name} className="border-t border-slate-100">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
                      />
                    </div>
                  </td>
                  {COMPONENTS.map((component) => {
                    const value = Number(row[component.key] || 0);
                    return (
                      <td
                        key={component.label}
                        className={`px-3 py-3 text-right ${value > 0 ? 'text-slate-900' : 'text-slate-300'}`}
                      >
                        {value > 0 ? formatCurrency(value) : '—'}
                      </td>
                    );
                  })}
                  <td
                    className={`py-3 pl-3 text-right font-bold ${
                      isBest ? 'text-emerald-600' : 'text-slate-950'
                    }`}
                  >
                    {formatCurrency(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400">
        Year 1 salary, bonus, realizable equity, sign-on, and benefits. Paper equity is excluded.
      </p>
    </div>
  );
};

export default Year1BreakdownList;
