import CustomWidgetCard from '../CustomWidgetCard';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import type { ApplicationStats } from '../../types';
import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { JobHuntStats } from './widgetStatsTypes';
import { SectionCard, renderPercentageList } from './widgetPrimitives';
import {
  ApplicationFunnelSection,
  HeadlineNumbers,
  WatchListSection,
} from './widgetFunnelSections';
import {
  DataHealthSection,
  OutcomesSection,
  ReplyTimingSection,
  ResponseSegmentsSection,
} from './widgetOutcomeSections';

export type { JobHuntStats } from './widgetStatsTypes';

export const renderJobHuntWidget = (
  id: string,
  stats: JobHuntStats,
  customWidgets: CustomWidget[],
  deleteCustomWidget: (id: string) => void,
  fieldCompleteness: ApplicationStats['field_completeness'] = [],
  onGhost?: (applicationId: number) => void
) => {
  switch (id) {
    case 'headline':
      return <HeadlineNumbers stats={stats} />;
    case 'funnel':
      return <ApplicationFunnelSection stats={stats} />;
    case 'watch_list':
      return <WatchListSection stats={stats} onGhost={onGhost} />;
    case 'reply_timing':
      return <ReplyTimingSection stats={stats} />;
    case 'outcomes':
      return <OutcomesSection stats={stats} />;
    case 'response_segments':
      return <ResponseSegmentsSection stats={stats} />;
    case 'data_health':
      return <DataHealthSection stats={stats} fieldCompleteness={fieldCompleteness} />;
    case 'top_locations':
      return (
        <SectionCard
          icon={<EnvironmentOutlined />}
          title="Top Locations"
          tooltip="Most common application locations, grouped by city or Remote, with exact counts and shares."
        >
          {renderPercentageList(stats.locations, stats.total, 'No location data')}
        </SectionCard>
      );
    case 'application_age':
      return (
        <SectionCard
          icon={<ClockCircleOutlined />}
          title="Application Age"
          tooltip="Application age using Date Applied when available and Created At as fallback, with exact counts and shares."
        >
          {renderPercentageList(
            stats.applicationAgeBreakdown,
            stats.total,
            'No application age data',
            5
          )}
        </SectionCard>
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

const WIDGET_COL_SPANS: Record<string, string> = {
  headline: 'col-span-1 md:col-span-2 lg:col-span-4',
  funnel: 'col-span-1 md:col-span-2 lg:col-span-2',
  watch_list: 'col-span-1 md:col-span-2 lg:col-span-2',
  reply_timing: 'col-span-1 md:col-span-2 lg:col-span-2',
  outcomes: 'col-span-1 md:col-span-2 lg:col-span-2',
  response_segments: 'col-span-1 md:col-span-2 lg:col-span-2',
  data_health: 'col-span-1 md:col-span-2 lg:col-span-2',
  top_locations: 'col-span-1',
  application_age: 'col-span-1',
};

export const getJobHuntWidgetColSpan = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((w) => w.id === id);
  if (customWidget) {
    return customWidget.widgetType === 'chart'
      ? 'col-span-1 md:col-span-2 lg:col-span-2'
      : 'col-span-1';
  }
  return WIDGET_COL_SPANS[id] ?? 'col-span-1';
};
