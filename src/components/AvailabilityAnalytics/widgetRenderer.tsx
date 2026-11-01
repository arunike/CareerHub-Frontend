import {
  CalendarOutlined,
  PieChartOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import CustomWidgetCard from '../dashboard/CustomWidgetCard';
import { MetricTile, SectionCard, StatCard } from '../dashboard/DashboardCards';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import { useChartCategorical } from '../../theme/chartColors';
import type { EventLoad } from '../../utils/Analytics/eventLoad';
import { AVAILABILITY_DONUT_INITIAL_DIMENSION } from '../../constants/chartDimensions';

const MIN_BAR_SHARE = 3;

export interface AvailabilityStats {
  totalEvents: number;
  thisWeek: number;
  byCategory: { name: string; value: number }[];
  load: EventLoad;
}

const ScheduleLoadCard = ({ load }: { load: EventLoad }) => (
  <SectionCard
    icon={<ThunderboltOutlined />}
    title="Schedule Load"
    tooltip="How thickly your events fall: the weekly average over the span they cover, the fullest single day, how many days hold more than one, and when they usually land."
  >
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricTile
        label="Per Week"
        tooltip="Events divided by the number of weeks between your first and last event, so a busy fortnight does not read as a busy year."
        value={load.perWeek}
        detail={`over ${load.spanWeeks} week${load.spanWeeks === 1 ? '' : 's'}`}
      />
      <MetricTile
        label="Busiest Day"
        tooltip="The highest number of events falling on one calendar day."
        value={load.busiestDay?.count ?? 0}
        detail={
          load.busiestDay ? format(parseISO(load.busiestDay.date), 'MMM d, yyyy') : 'No events'
        }
        tone="amber"
      />
      <MetricTile
        label="Doubled-Up Days"
        tooltip="Days holding more than one event. Back-to-back days are the ones that cost you."
        value={load.multiEventDays}
        detail="2 or more in one day"
        tone="slate"
      />
      <MetricTile
        label="Usually"
        tooltip="The weekday most of your events land on, and the hour they most often start."
        value={load.busiestWeekday?.label ?? '-'}
        detail={load.busiestHour ? `around ${load.busiestHour.label}` : 'No pattern'}
        tone="emerald"
      />
    </div>
  </SectionCard>
);

const EventCategoryCard = ({ byCategory }: { byCategory: { name: string; value: number }[] }) => {
  const palette = useChartCategorical();
  const total = byCategory.reduce((sum, slice) => sum + slice.value, 0);

  if (byCategory.length === 0) {
    return (
      <SectionCard
        icon={<PieChartOutlined />}
        title="Events by Category"
        tooltip="How your events split across the categories you have set up."
      >
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-ink-900 px-4 py-6 text-center text-sm text-gray-500 dark:text-ink-400">
          No category data available
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<PieChartOutlined />}
      title="Events by Category"
      tooltip="How your events split across the categories you have set up."
    >
      {/* Wraps on the card's width, not the viewport's: the card is resizable. */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="careerhub-responsive-pie relative mx-auto h-52 min-w-0 max-w-[260px] grow basis-[200px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={1}
            initialDimension={AVAILABILITY_DONUT_INITIAL_DIMENSION}
          >
            <PieChart>
              <Pie
                data={byCategory}
                cx="50%"
                cy="50%"
                dataKey="value"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
                stroke="none"
              >
                {byCategory.map((slice, index) => (
                  <Cell key={slice.name} fill={palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold leading-none tabular-nums text-gray-900 dark:text-ink-50">
              {total}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
              {total === 1 ? 'event' : 'events'}
            </span>
          </div>
        </div>

        <ul className="min-w-0 grow basis-[260px] space-y-0.5">
          {byCategory.map((slice, index) => {
            const color = palette[index % palette.length];
            const share = (slice.value / total) * 100;
            return (
              <li
                key={slice.name}
                className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-ink-800"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="w-28 shrink-0 truncate text-sm text-gray-700 dark:text-ink-100"
                  title={slice.name}
                >
                  {slice.name}
                </span>
                <span className="h-2 min-w-[24px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(share, MIN_BAR_SHARE)}%`, backgroundColor: color }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-ink-50">
                  {slice.value}
                </span>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-ink-400">
                  {Math.round(share)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </SectionCard>
  );
};

export const renderAvailabilityWidget = (
  id: string,
  stats: AvailabilityStats,
  customWidgets: CustomWidget[],
  deleteCustomWidget: (id: string) => void
) => {
  switch (id) {
    case 'total':
      return (
        <StatCard icon={<CalendarOutlined />} label="Total Events" value={stats.totalEvents} />
      );
    case 'weekly':
      return <StatCard icon={<RiseOutlined />} label="Events This Week" value={stats.thisWeek} />;
    case 'load':
      return <ScheduleLoadCard load={stats.load} />;
    case 'category':
      return <EventCategoryCard byCategory={stats.byCategory} />;
    default: {
      const customWidget = customWidgets.find((w) => w.id === id);
      if (customWidget) {
        return <CustomWidgetCard widget={customWidget} onDelete={deleteCustomWidget} />;
      }
      return null;
    }
  }
};

// Columns out of 12, used as the starting width before the user drags one wider or narrower.
const WIDGET_GRID_WIDTHS: Record<string, number> = {
  total: 6,
  weekly: 6,
  load: 12,
  category: 12,
};

export const getAvailabilityWidgetGridWidth = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) return customWidget.widgetType === 'chart' ? 6 : 4;
  return WIDGET_GRID_WIDTHS[id] ?? 4;
};
