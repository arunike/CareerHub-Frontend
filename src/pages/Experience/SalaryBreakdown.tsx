import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { SEGMENTS, fmtMoney } from './compensationBreakdownFormat';
import { EditNotice } from './breakdownRows';

export const SalaryBreakdown = ({
  total,
  base,
  bonus,
  equity,
  totalLabel,
  totalHint,
  onEdit,
  editLabel,
}: {
  total: number;
  base: number;
  bonus: number;
  equity: number;
  totalLabel?: string;
  totalHint?: string;
  onEdit?: () => void;
  editLabel?: string;
}) => {
  const breakdown = { base, bonus, equity };
  const chartData = SEGMENTS.map((segment) => ({
    ...segment,
    value: breakdown[segment.key],
  })).filter((segment) => segment.value > 0);

  return (
    <div className="mt-2 space-y-4">
      {onEdit && (
        <EditNotice
          title="These pay inputs are editable"
          hint="Update base, bonus, or equity on this role anytime. The breakdown will refresh from your saved values."
          actionLabel={editLabel ?? 'Edit role'}
          onEdit={onEdit}
        />
      )}

      <div className="grid gap-5 md:grid-cols-[320px,1fr]">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            {totalLabel ?? 'Total Annual Earnings'}
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{fmtMoney(total)}</div>
          <div className="mt-1 text-sm text-gray-500">
            {totalHint ?? 'Base salary + bonus + equity, annualized'}
          </div>

          <div className="mt-5 h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={240}
                minHeight={240}
                initialDimension={{ width: 240, height: 256 }}
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {chartData.map((segment) => (
                      <Cell key={segment.key} fill={segment.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => fmtMoney(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: 14,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-gray-200 bg-white/80 flex items-center justify-center text-sm text-gray-400">
                No compensation data yet
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {SEGMENTS.map((segment) => {
            const value = breakdown[segment.key];
            const pct = total > 0 ? (value / total) * 100 : 0;

            return (
              <div
                key={segment.key}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-sm font-semibold text-gray-800">{segment.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {value > 0 ? `${pct.toFixed(1)}% of total compensation` : 'Not included'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{fmtMoney(value)}</div>
                  </div>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: value > 0 ? `${Math.max(pct, 4)}%` : '0%',
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
