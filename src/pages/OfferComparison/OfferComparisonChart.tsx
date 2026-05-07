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
            <Tooltip formatter={(val: number | undefined) => `$${(val || 0).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="Base" stackId="a" fill="#1890ff" />
            <Bar dataKey="Bonus" stackId="a" fill="#3b82f6" />
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
