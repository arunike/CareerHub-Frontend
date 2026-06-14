import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type ChartDatum = {
  id?: string;
  name: string;
  Base: number;
  Bonus: number;
  Equity: number;
  SignOn: number;
  Benefits: number;
};

type Props = {
  data: ChartDatum[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + Number(entry.value || 0), 0);
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-md text-xs space-y-1.5 min-w-[200px]">
        <p className="font-bold text-slate-800">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold text-slate-700">
                $
                {Number(entry.value).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 pt-1.5 mt-1.5 flex items-center justify-between font-bold text-slate-900">
          <span>Total:</span>
          <span>
            $
            {total.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

const OfferComparisonChart = ({ data }: Props) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">First-Year Compensation</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Year 1 salary, bonus, equity, sign-on, and benefits. Future-year compensation may change.
        </p>
      </div>
      <div className="h-[280px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(val) => `$${val / 1000}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Base" stackId="a" fill="#2563eb" />
            <Bar dataKey="Bonus" stackId="a" fill="#60a5fa" />
            <Bar dataKey="Equity" stackId="a" fill="#ec4899" />
            <Bar dataKey="SignOn" stackId="a" fill="#14b8a6" />
            <Bar dataKey="Benefits" stackId="a" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OfferComparisonChart;
