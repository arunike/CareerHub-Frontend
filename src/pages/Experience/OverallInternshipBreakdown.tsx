import { fmtMoney, fmtNumber } from './compensationBreakdownFormat';
import { PayPartsPanel, type PayPart } from './PayPartsPanel';

export const OverallInternshipBreakdown = ({
  parts,
  roleCount,
  hours,
}: {
  parts: PayPart[];
  roleCount: number;
  hours: number;
}) => {
  const total = parts.reduce((sum, part) => sum + part.total, 0);

  return (
    <div className="mt-2 space-y-4">
      <div className="rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-white dark:via-ink-900 to-blue-50 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-ink-500">
          Combined internship earnings
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-ink-50">
          {fmtMoney(total)}
        </div>
        <div className="mt-1 text-sm text-gray-500 dark:text-ink-400">
          Across {roleCount} internship{roleCount === 1 ? '' : 's'}
          {hours > 0 && ` · ${fmtNumber(hours)} hours`}
        </div>

        <div className="mt-5">
          <PayPartsPanel
            parts={parts}
            total={total}
            chartEmpty="No internship earnings yet"
            memberNoun="role"
          />
        </div>
      </div>
    </div>
  );
};

export default OverallInternshipBreakdown;
