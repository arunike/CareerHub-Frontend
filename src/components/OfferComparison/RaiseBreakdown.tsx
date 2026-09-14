import { delta, fmt, fmtPct } from './raiseHistoryFields';

export interface BreakdownRow {
  label: string;
  before: number;
  after: number;
  extra?: string;
}

const tone = (changed: boolean, up: boolean) =>
  changed
    ? up
      ? 'text-green-600 dark:text-green-300'
      : 'text-red-500 dark:text-red-400'
    : 'text-gray-400 dark:text-ink-500';

// Four money columns will not fit a phone, so the table is for tablets up and the phone gets rows.
const RaiseBreakdown = ({
  rows,
  tcBefore,
  tcAfter,
}: {
  rows: BreakdownRow[];
  tcBefore: number;
  tcAfter: number;
}) => (
  <>
    <div className="divide-y divide-gray-50 dark:divide-white/[0.07] sm:hidden">
      {rows.map((row) => {
        const changed = row.after !== row.before;
        return (
          <div key={row.label} className="px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-gray-700 dark:text-ink-100">{row.label}</span>
              <span className={`text-xs font-medium ${tone(changed, row.after >= row.before)}`}>
                {changed
                  ? `${delta(row.before, row.after)} · ${fmtPct(row.before, row.after)}`
                  : 'No change'}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5 text-sm tabular-nums">
              <span className="text-gray-400 dark:text-ink-500">{fmt(row.before)}</span>
              <span className="text-gray-300 dark:text-ink-600">→</span>
              <span className="font-medium text-gray-800 dark:text-ink-50">{fmt(row.after)}</span>
            </div>
            {row.extra && (
              <div className="mt-0.5 text-xs text-gray-400 dark:text-ink-500">{row.extra}</div>
            )}
          </div>
        );
      })}
      <div className="bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">Total TC</span>
          <span
            className={`text-xs font-semibold ${tcAfter >= tcBefore ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}
          >
            {delta(tcBefore, tcAfter)} · {fmtPct(tcBefore, tcAfter)}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5 text-sm tabular-nums text-blue-900 dark:text-blue-200">
          <span className="opacity-60">{fmt(tcBefore)}</span>
          <span className="opacity-40">→</span>
          <span className="font-semibold">{fmt(tcAfter)}</span>
        </div>
      </div>
    </div>

    <table className="hidden w-full text-sm sm:table">
      <thead>
        <tr className="border-b border-gray-100 dark:border-white/[0.07] text-xs uppercase tracking-wide text-gray-400 dark:text-ink-500">
          <th className="px-4 py-2 text-left font-medium">Component</th>
          <th className="px-4 py-2 text-right font-medium">Before</th>
          <th className="px-4 py-2 text-right font-medium">After</th>
          <th className="px-4 py-2 text-right font-medium">+/-</th>
          <th className="px-4 py-2 text-right font-medium">%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const changed = row.after !== row.before;
          const colour = tone(changed, row.after >= row.before);
          return (
            <tr
              key={row.label}
              className="border-b border-gray-50 dark:border-white/[0.07] hover:bg-gray-50"
            >
              <td className="px-4 py-2 text-gray-700 dark:text-ink-100">
                <div>{row.label}</div>
                {row.extra && (
                  <div className="text-xs text-gray-400 dark:text-ink-500">{row.extra}</div>
                )}
              </td>
              <td className="px-4 py-2 text-right text-gray-500 dark:text-ink-400">
                {fmt(row.before)}
              </td>
              <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-ink-100">
                {fmt(row.after)}
              </td>
              <td className={`px-4 py-2 text-right font-medium ${colour}`}>
                {changed ? delta(row.before, row.after) : '—'}
              </td>
              <td className={`px-4 py-2 text-right font-medium ${colour}`}>
                {changed ? fmtPct(row.before, row.after) : '—'}
              </td>
            </tr>
          );
        })}
        <tr className="bg-blue-50 dark:bg-blue-500/10 font-semibold text-blue-900 dark:text-blue-200">
          <td className="px-4 py-2">Total TC</td>
          <td className="px-4 py-2 text-right">{fmt(tcBefore)}</td>
          <td className="px-4 py-2 text-right">{fmt(tcAfter)}</td>
          <td
            className={`px-4 py-2 text-right ${tcAfter >= tcBefore ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}
          >
            {delta(tcBefore, tcAfter)}
          </td>
          <td
            className={`px-4 py-2 text-right ${tcAfter >= tcBefore ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}
          >
            {fmtPct(tcBefore, tcAfter)}
          </td>
        </tr>
      </tbody>
    </table>
  </>
);

export default RaiseBreakdown;
