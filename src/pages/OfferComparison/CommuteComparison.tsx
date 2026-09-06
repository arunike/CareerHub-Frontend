import {
  COMMUTE_MODE_LABELS,
  effectiveFuelInputs,
  formatDuration,
  formatHours,
  fuelBreakdownFor,
  isFuelCosted,
  isRoundTrip,
  type DrivingDefaults,
} from './commute';
import type { ScenarioRow } from './offerAdjustmentsTypes';

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

// Hours as well as cost: $2,400 a year is noise next to a salary, 200 hours is not.
const CommuteComparison = ({
  scenarioRows,
  drivingDefaults,
}: {
  scenarioRows: ScenarioRow[];
  drivingDefaults?: Partial<DrivingDefaults> | null;
}) => {
  const rows = scenarioRows.filter((row) => row.commute?.primary);
  if (rows.length === 0) return null;

  const worstHours = Math.max(...rows.map((row) => row.commute?.annualHours ?? 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-slate-500 dark:text-ink-400">
        Travel time counted over the office days each offer actually requires, from its RTO policy
        and time off.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-ink-400">
            <tr>
              <th className="py-2 pr-4 text-left font-bold">Offer</th>
              <th className="px-3 py-2 text-left font-bold">Mode</th>
              <th className="px-3 py-2 text-right font-bold">Office days</th>
              <th className="px-3 py-2 text-right font-bold">Time</th>
              <th className="py-2 pl-3 text-right font-bold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const commute = row.commute!;
              const primary = commute.primary!;
              const fuel = isFuelCosted(primary)
                ? fuelBreakdownFor(primary, commute.officeDays, drivingDefaults)
                : null;
              const fuelInputs = effectiveFuelInputs(primary, drivingDefaults);
              const share = worstHours > 0 ? (commute.annualHours / worstHours) * 100 : 0;
              const isBest =
                commute.annualHours ===
                Math.min(...rows.map((other) => other.commute?.annualHours ?? 0));
              return (
                <tr
                  key={row.appName}
                  className="border-t border-slate-100 dark:border-white/[0.07] align-top"
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900 dark:text-ink-50">{row.appName}</div>
                    <div className="mt-1.5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
                      <div
                        className={`h-full rounded-full ${isBest ? 'bg-emerald-400' : 'bg-amber-400'}`}
                        style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-slate-900 dark:text-ink-50">
                      {COMMUTE_MODE_LABELS[primary.mode]}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-ink-500">
                      {formatDuration(primary.minutes_each_way)} each way
                    </div>
                    {commute.alternatives.length > 1 && (
                      <div className="mt-1 text-[11px] text-slate-400 dark:text-ink-500">
                        {commute.alternatives
                          // alternatives are mapped copies, so identity no longer matches
                          .filter((option) => option.mode !== primary.mode)
                          .map(
                            (option) =>
                              `${COMMUTE_MODE_LABELS[option.mode]} ${formatHours(option.annualHours)}`
                          )
                          .join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-ink-200">
                    {Math.round(commute.officeDays)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div
                      className={`tabular-nums ${isBest ? 'font-semibold text-emerald-600 dark:text-emerald-300' : 'text-slate-900 dark:text-ink-50'}`}
                    >
                      {formatHours(commute.annualHours)}
                    </div>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <div className="font-bold tabular-nums text-slate-950 dark:text-ink-50">
                      {money(commute.annualCost)}
                    </div>
                    {/* A derived figure shows its working where it is read, not only in the form that produced it. */}
                    {fuel && (
                      <div className="text-[11px] text-slate-400 dark:text-ink-500 tabular-nums">
                        {Math.round(fuel.annualMiles).toLocaleString()} mi (
                        {primary.miles_each_way ?? 0}{' '}
                        {isRoundTrip(primary) ? 'round trip' : 'each way'}) @ {fuelInputs.mpg} mpg ·
                        ${fuelInputs.gasPricePerGallon}/gal
                        {fuel.parkingCost > 0 && <> + {money(fuel.parkingCost)} parking</>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommuteComparison;
