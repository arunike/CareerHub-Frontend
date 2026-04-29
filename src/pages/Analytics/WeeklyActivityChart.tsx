import { RiseOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type WeeklyActivityPoint = {
  date: string;
  count: number;
};

type Props = {
  data: WeeklyActivityPoint[];
};

const WeeklyActivityChart = ({ data }: Props) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center gap-2">
        <RiseOutlined className="mr-2 text-xl text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Weekly Activity (Last 12 Weeks)</h3>
      </div>
      <div className="h-[280px] w-full sm:h-75">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="count" name="Applications" fill="#1890ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyActivityChart;
