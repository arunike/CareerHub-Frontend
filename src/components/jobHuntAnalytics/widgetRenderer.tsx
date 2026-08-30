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

const WIDGET_GRID_WIDTHS: Record<string, number> = {
  headline: 12,
  funnel: 6,
  watch_list: 6,
  reply_timing: 6,
  outcomes: 6,
  response_segments: 6,
  data_health: 6,
  top_locations: 3,
  application_age: 3,
};

// Columns out of 12, used as the starting width before the user drags one wider or narrower.
export const getJobHuntWidgetGridWidth = (id: string, customWidgets: CustomWidget[]) => {
  const customWidget = customWidgets.find((widget) => widget.id === id);
  if (customWidget) return customWidget.widgetType === 'chart' ? 6 : 3;
  return WIDGET_GRID_WIDTHS[id] ?? 3;
};
