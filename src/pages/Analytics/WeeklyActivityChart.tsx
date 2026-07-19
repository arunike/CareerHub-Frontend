import { RiseOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ANALYTICS_CHART_INITIAL_DIMENSION } from '../../constants/chartDimensions';

type WeeklyActivityPoint = {
  date: string;
  count: number;
};

type Props = {
  data: WeeklyActivityPoint[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgba(49,88,183,0.055)] rounded-xl p-3.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-sm font-bold text-slate-900">
          {payload[0].value} Application{payload[0].value !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

const WeeklyActivityChart = ({ data }: Props) => {
  return (
    <div className="enterprise-card p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2">
        <RiseOutlined className="mr-2 text-xl text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Weekly Activity (Last 12 Weeks)</h3>
      </div>
      <div className="h-[280px] w-full sm:h-75">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={1}
          initialDimension={ANALYTICS_CHART_INITIAL_DIMENSION}
        >
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="activityBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.92} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.34} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              fontSize={11}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              fontSize={11}
              tickMargin={8}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.035)' }} />
            <Bar
              dataKey="count"
              name="Applications"
              fill="url(#activityBarGradient)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyActivityChart;
