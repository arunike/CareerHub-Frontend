import {
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PieChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import CustomWidgetCard from '../CustomWidgetCard';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import { COLORS } from './constants';

export interface AvailabilityStats {
  totalEvents: number;
  thisWeek: number;
  avgDuration: number;
  byCategory: { name: string; value: number }[];
  dailyActivity: { date: string; count: number; minutes: number }[];
}

export const renderAvailabilityWidget = (
  id: string,
  stats: AvailabilityStats,
  customWidgets: CustomWidget[],
  deleteCustomWidget: (id: string) => void
) => {
  switch (id) {
    case 'total':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <CalendarOutlined className="text-2xl text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
          </div>
        </div>
      );
    case 'weekly':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
              <RiseOutlined className="text-2xl text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Events This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>
      );
    case 'duration':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
              <ClockCircleOutlined className="text-2xl text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgDuration} min</p>
            </div>
          </div>
        </div>
      );
    case 'category':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center gap-2 mb-6">
            <PieChartOutlined className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Events by Category</h3>
          </div>
          <div className="h-75 w-full">
            {stats.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                  >
                    {stats.byCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No category data available
              </div>
            )}
          </div>
        </div>
      );
    case 'activity':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center gap-2 mb-6">
            <BarChartOutlined className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Daily Activity (Last 7 Days)</h3>
          </div>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" stroke="#1890ff" />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Events" fill="#1890ff" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="minutes" name="Minutes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    default: {
      const customWidget = customWidgets.find((w) => w.id === id);
      if (customWidget) {
        return <CustomWidgetCard widget={customWidget} onDelete={deleteCustomWidget} />;
      }
      return null;
    }
  }
};

export const getAvailabilityWidgetClass = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) {
    return customWidget.widgetType === 'chart'
      ? 'col-span-1 md:col-span-3 lg:col-span-3'
      : 'col-span-1 md:col-span-2 lg:col-span-2';
  }

  if (['total', 'weekly', 'duration'].includes(id)) {
    return 'col-span-1 md:col-span-2 lg:col-span-2';
  }
  if (['category', 'activity'].includes(id)) {
    return 'col-span-1 md:col-span-3 lg:col-span-3';
  }
  return 'col-span-1';
};
