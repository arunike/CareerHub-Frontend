import {
  AimOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  NumberOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import CustomWidgetCard from '../CustomWidgetCard';
import type { CustomWidget } from '../../hooks/useCustomWidgets';

export type JobHuntStats = {
  total: number;
  rejections: number;
  offers: number;
  ghosted: number;
  activeInterviews: number;
  totalInterviews: number;
  interviewRate: string;
  locations: { name: string; count: number }[];
  rounds: { name: string; count: number }[];
  funnel: { label: string; value: number; color: string }[];
  avgDaysToOffer: number | null;
};

export const renderJobHuntWidget = (
  id: string,
  stats: JobHuntStats,
  customWidgets: CustomWidget[],
  deleteCustomWidget: (id: string) => void
) => {
  switch (id) {
    case 'total':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Applications</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <FileTextOutlined className="mr-1.5 text-base" />
            <span>Tracked</span>
          </div>
        </div>
      );
    case 'active':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Interviews</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{stats.activeInterviews}</p>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                {stats.interviewRate}% Rate
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <ClockCircleOutlined className="mr-1.5 text-blue-500 text-base" />
            <span>In Pipeline</span>
          </div>
        </div>
      );
    case 'outcomes':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Outcomes</p>
            <div className="flex gap-4">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.offers}</p>
                <p className="text-xs text-gray-500">Offers</p>
              </div>
              <div className="w-px bg-gray-200 h-10"></div>
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.rejections}</p>
                <p className="text-xs text-gray-500">Rejections</p>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-400">
            <CheckCircleOutlined className="mr-1.5 text-green-500 text-base" />
            <span>vs</span>
            <CloseCircleOutlined className="ml-1.5 text-red-500 text-base" />
          </div>
        </div>
      );
    case 'ghosted':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">No Response</p>
            <p className="text-3xl font-bold text-gray-700">{stats.ghosted}</p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <QuestionCircleOutlined className="mr-1.5 text-gray-400 text-base" />
            <span>Ghosted</span>
          </div>
        </div>
      );
    case 'locations':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <EnvironmentOutlined className="text-xl text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Locations</h3>
            </div>
          </div>
          <div className="space-y-4">
            {stats.locations.slice(0, 8).map((loc, idx) => (
              <div key={loc.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      idx === 0
                        ? 'bg-blue-100 text-blue-700'
                        : idx === 1
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 font-medium">{loc.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(loc.count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-mono text-gray-900 font-bold">{loc.count}</span>
                </div>
              </div>
            ))}
            {stats.locations.length === 0 && (
              <div className="text-center py-8 text-gray-400">No location data found</div>
            )}
          </div>
        </div>
      );
    case 'rounds':
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AimOutlined className="text-xl text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Interview Rounds</h3>
            </div>
          </div>
          <div className="h-75 w-full">
            {stats.rounds.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.rounds}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="count" name="Applications" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {stats.rounds.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#1890ff', '#8b5cf6', '#ec4899', '#f43f5e'][index % 4]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <NumberOutlined className="text-3xl mb-2 opacity-50" />
                <p>No interview rounds logged yet</p>
                <p className="text-xs mt-1">Add "Current Round" to applications to see stats</p>
              </div>
            )}
          </div>
        </div>
      );
    case 'funnel': {
      const funnelMax = Math.max(...stats.funnel.map(s => s.value), 1);
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500 mb-4">Application Funnel</p>
          <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between w-full overflow-x-auto pb-2 flex-grow">
            {stats.funnel.map((step, idx) => {
              const heightPercent = Math.max((step.value / funnelMax) * 100, 5); // min 5% height
              return (
                <div key={idx} className="flex-1 flex flex-col justify-end min-w-[60px]">
                  <div className="text-center mb-2">
                    <span className="font-bold text-gray-900 block">{step.value}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter truncate block" title={step.label}>{step.label}</span>
                  </div>
                  <div className={`w-full rounded-t-lg border-t-2 opacity-80 ${step.color}`} style={{ height: `${heightPercent}px`, minHeight: '4px' }} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case 'avg_days_to_offer':
      return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Avg Days to Offer</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats.avgDaysToOffer !== null ? stats.avgDaysToOffer : '-'}
            </p>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <ClockCircleOutlined className="mr-1.5 text-base" />
            <span>Average duration</span>
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

export const getJobHuntWidgetColSpan = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) {
    return customWidget.widgetType === 'chart'
      ? 'col-span-1 md:col-span-2 lg:col-span-2'
      : 'col-span-1';
  }

  if (['locations', 'rounds', 'funnel'].includes(id)) {
    return 'col-span-1 md:col-span-2 lg:col-span-2';
  }
  return 'col-span-1';
};
