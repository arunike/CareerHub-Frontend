import {
  CalendarOutlined,
  PieChartOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import CustomWidgetCard from '../CustomWidgetCard';
import CollapsibleCard from './CollapsibleCard';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import { COLORS } from './constants';
import type { EventLoad } from '../../pages/Analytics/eventLoad';
import { ANALYTICS_CHART_INITIAL_DIMENSION } from '../../constants/chartDimensions';

export interface AvailabilityStats {
  totalEvents: number;
  thisWeek: number;
  byCategory: { name: string; value: number }[];
  load: EventLoad;
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
        <div className="enterprise-card h-full p-4 sm:p-6">
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
        <div className="enterprise-card h-full p-4 sm:p-6">
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
    case 'load':
      return (
        <CollapsibleCard
          icon={<ThunderboltOutlined className="h-5 w-5 text-gray-600" />}
          title="Schedule Load"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 opacity-80">
                Per Week
              </p>
              <p className="mt-1 text-2xl font-bold leading-none text-blue-700">
                {stats.load.perWeek}
              </p>
              <p className="mt-1.5 text-xs text-blue-700 opacity-75">
                over {stats.load.spanWeeks} week{stats.load.spanWeeks === 1 ? '' : 's'}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 opacity-80">
                Busiest Day
              </p>
              <p className="mt-1 text-2xl font-bold leading-none text-amber-700">
                {stats.load.busiestDay?.count ?? 0}
              </p>
              <p className="mt-1.5 text-xs text-amber-700 opacity-75">
                {stats.load.busiestDay
                  ? format(parseISO(stats.load.busiestDay.date), 'MMM d, yyyy')
                  : 'No events'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 opacity-80">
                Doubled-Up Days
              </p>
              <p className="mt-1 text-2xl font-bold leading-none text-slate-700">
                {stats.load.multiEventDays}
              </p>
              <p className="mt-1.5 text-xs text-slate-700 opacity-75">2 or more in one day</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 opacity-80">
                Usually
              </p>
              <p className="mt-1 truncate text-xl font-bold leading-none text-emerald-700">
                {stats.load.busiestWeekday?.label ?? '-'}
              </p>
              <p className="mt-1.5 text-xs text-emerald-700 opacity-75">
                {stats.load.busiestHour ? `around ${stats.load.busiestHour.label}` : 'No pattern'}
              </p>
            </div>
          </div>
        </CollapsibleCard>
      );
    case 'category':
      return (
        <CollapsibleCard
          icon={<PieChartOutlined className="w-5 h-5 text-gray-600" />}
          title="Events by Category"
        >
          <div className="careerhub-responsive-pie h-75 w-full">
            {stats.byCategory.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={1}
                initialDimension={ANALYTICS_CHART_INITIAL_DIMENSION}
              >
                <PieChart>
                  <Pie
                    data={stats.byCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`
                    }
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
        </CollapsibleCard>
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

const WIDGET_GRID_WIDTHS: Record<string, number> = {
  total: 4,
  weekly: 4,
  load: 4,
  category: 6,
};

// Columns out of 12, used as the starting width before the user drags one wider or narrower.
export const getAvailabilityWidgetGridWidth = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) return customWidget.widgetType === 'chart' ? 6 : 4;
  return WIDGET_GRID_WIDTHS[id] ?? 2;
};
