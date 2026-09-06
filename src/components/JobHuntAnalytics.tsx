import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid, Typography, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useCustomWidgets } from '../hooks/useCustomWidgets';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import type { CustomWidget } from '../hooks/useCustomWidgets';
import type { VisualConfig } from '../lib/visualWidgetQuery';
import { AVAILABLE_WIDGETS } from './jobHuntAnalytics/constants';
import DashboardCustomizeModal from './jobHuntAnalytics/DashboardCustomizeModal';
import CreateCustomWidgetModal from './jobHuntAnalytics/CreateCustomWidgetModal';
import { WidgetCollapseProvider } from './jobHuntAnalytics/widgetCollapse';
import { usePersistedState } from '../hooks/usePersistedState';
import WidgetGrid, { GRID_COLS } from './jobHuntAnalytics/WidgetGrid';
import type { Placement } from './jobHuntAnalytics/WidgetGrid';
import {
  getJobHuntWidgetGridWidth,
  renderJobHuntWidget,
  type JobHuntStats,
} from './jobHuntAnalytics/widgetRenderer';
import { getApplicationTimelineAnalytics, updateApplication } from '../api/career';
import { getApiErrorMessage } from '../utils/apiError';

import type { ApplicationStats, ApplicationTimelineAnalytics } from '../types';
const { Text } = Typography;

interface AnalyticsProps {
  applicationStats: ApplicationStats | null;
  selectedYear?: number | 'all';
  // Called after this component changes an application, so the page can refetch its stats.
  onDataChanged?: () => void;
}

type ValidationResult = NonNullable<CustomWidget['cachedData']>;

const RETIRED_WIDGET_IDS = new Set([
  'response_rate',
  'offer_rate',
  'recent_applications',
  // Not today's 'top_locations': reusing the id would drop the new section from saved layouts.
  'locations',
  'top_companies',
  'work_modes',
]);
// Legacy widget ids; any saved selection holding one is replaced with the defaults.
const PRE_SPLIT_WIDGET_IDS = new Set([
  'total',
  'active',
  'ghosted',
  'pipeline_breakdown',
  'timeline_analytics',
  'job_search',
]);
const AVAILABLE_WIDGET_IDS = new Set(AVAILABLE_WIDGETS.map((widget) => widget.id));
// Sections built from the timeline endpoint. If none of them is on, there is nothing to fetch.
const ANALYTICS_BACKED_WIDGETS = new Set([
  'headline',
  'funnel',
  'watch_list',
  'reply_timing',
  'outcomes',
  'response_segments',
  'data_health',
]);
const DEFAULT_WIDGET_IDS = AVAILABLE_WIDGETS.filter((widget) => widget.defaultEnabled).map(
  (widget) => widget.id
);

const normalizeEnabledWidgets = (ids: string[]) => {
  if (ids.some((id) => PRE_SPLIT_WIDGET_IDS.has(id))) {
    // 'outcomes' survives as a section id, so only a pre-split id decides this.
    return DEFAULT_WIDGET_IDS;
  }
  const normalized = ids.filter(
    (id) => AVAILABLE_WIDGET_IDS.has(id) && !RETIRED_WIDGET_IDS.has(id)
  );
  return normalized.length > 0 ? normalized : DEFAULT_WIDGET_IDS;
};

const EMPTY_PLACEMENTS: Record<string, Placement> = {};

const JobHuntAnalytics: React.FC<AnalyticsProps> = ({
  applicationStats,
  selectedYear = 'all',
  onDataChanged,
}) => {
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [collapsedWidgets, setCollapsedWidgets] = usePersistedState<string[]>(
    'careerhub.analytics.jobHunt.collapsed',
    []
  );
  const toggleCollapsed = (id: string) =>
    setCollapsedWidgets((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  const [messageApi, contextHolder] = message.useMessage();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const {
    enabled: enabledWidgets,
    order: widgetOrder,
    setEnabled: setEnabledWidgets,
  } = useDashboardLayout('jobHunt', DEFAULT_WIDGET_IDS, normalizeEnabledWidgets);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setGridWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Where each widget sits, chosen by dragging; v1 held the pre-settling layout, so it is dropped.
  const [placements, setPlacements] = usePersistedState<Record<string, Placement>>(
    'careerhub.analytics.jobHunt.placements.v2',
    {}
  );

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isCreateWidgetOpen, setIsCreateWidgetOpen] = useState(false);
  const [timelineAnalytics, setTimelineAnalytics] = useState<ApplicationTimelineAnalytics | null>(
    null
  );
  const [timelineAnalyticsLoading, setTimelineAnalyticsLoading] = useState(false);
  const [timelineAnalyticsError, setTimelineAnalyticsError] = useState(false);

  // Ghosting one has to refresh the analytics too, or the row stays on a "still waiting" list.
  const handleGhost = async (applicationId: number) => {
    try {
      await updateApplication(applicationId, { status: 'GHOSTED' });
      messageApi.success('Marked as ghosted');
      onDataChanged?.();
      setTimelineRefreshKey((key) => key + 1);
    } catch (error) {
      console.error('Failed to mark the application as ghosted', error);
      messageApi.error(getApiErrorMessage(error, 'Could not update that application'));
    }
  };

  const { customWidgets, addCustomWidget, deleteCustomWidget, testQuery } = useCustomWidgets(
    'job_hunt_analytics_custom',
    'job-hunt',
    messageApi
  );

  // Whether any widget needs the fetch, not which: an array dep refetched on every toggle.
  const needsTimelineAnalytics = enabledWidgets.some((id) => ANALYTICS_BACKED_WIDGETS.has(id));

  useEffect(() => {
    if (!needsTimelineAnalytics) return;

    let mounted = true;
    setTimelineAnalyticsLoading(true);
    setTimelineAnalyticsError(false);
    getApplicationTimelineAnalytics(selectedYear)
      .then((response) => {
        if (mounted) {
          setTimelineAnalytics(response.data);
        }
      })
      .catch((error) => {
        console.error('Failed to load timeline analytics', error);
        if (mounted) {
          setTimelineAnalyticsError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setTimelineAnalyticsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [needsTimelineAnalytics, selectedYear, timelineRefreshKey]);

  const toggleWidget = (widgetId: string) => {
    if (enabledWidgets.includes(widgetId)) {
      // The dashboard has to keep at least one widget.
      if (enabledWidgets.length === 1) return;
      setEnabledWidgets(enabledWidgets.filter((id) => id !== widgetId));
    } else {
      setEnabledWidgets([...enabledWidgets, widgetId]);
    }
  };

  const handleCreateCustomWidget = (widgetData: {
    name: string;
    queryType: 'ai' | 'visual';
    visualConfig?: VisualConfig;
    query: string;
    icon: string;
    color: string;
    cachedData: ValidationResult;
  }) => {
    const customWidget: CustomWidget = {
      id: `custom-${Date.now()}`,
      name: widgetData.name,
      query: widgetData.query,
      widgetType: widgetData.cachedData.type,
      icon: widgetData.icon,
      color: widgetData.color,
      createdAt: new Date().toISOString(),
      queryType: widgetData.queryType,
      visualConfig: widgetData.visualConfig,
      cachedData: widgetData.cachedData,
    };

    addCustomWidget(customWidget);

    setEnabledWidgets([...enabledWidgets, customWidget.id]);

    setIsCreateWidgetOpen(false);
    messageApi.success('Custom widget created!');
  };

  const handleDeleteCustomWidget = (id: string) => {
    deleteCustomWidget(id);
    setEnabledWidgets(enabledWidgets.filter((wId) => wId !== id));
  };

  // A phone gets one full-width column, so desktop placements are ignored rather than squeezed.
  const gridWidths = useCallback(
    (id: string) => (isMobile ? GRID_COLS : getJobHuntWidgetGridWidth(id, customWidgets)),
    [isMobile, customWidgets]
  );

  // The server counted these; the browser only renames the fields.
  const stats: JobHuntStats = useMemo(
    () => ({
      total: applicationStats?.total ?? 0,
      offers: applicationStats?.offers ?? 0,
      ghosted: applicationStats?.ghosted ?? 0,
      activeInterviews: applicationStats?.active_interviews ?? 0,
      totalInterviews: applicationStats?.total_interviews ?? 0,
      responseRate: applicationStats?.response_rate ?? '0.0',
      respondedCount: applicationStats?.responded_count ?? 0,
      offerRate: applicationStats?.offer_rate ?? '0.0',
      recentApplications30d: applicationStats?.recent_applications_30d ?? 0,
      locations: applicationStats?.locations ?? [],
      applicationAgeBreakdown: applicationStats?.application_age_breakdown ?? [],
      timelineAnalytics,
      timelineAnalyticsLoading,
      timelineAnalyticsError,
    }),
    [applicationStats, timelineAnalytics, timelineAnalyticsLoading, timelineAnalyticsError]
  );

  return (
    <>
      {contextHolder}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <Text className="text-gray-500 dark:text-ink-400">
            {enabledWidgets.length} widget{enabledWidgets.length !== 1 ? 's' : ''} enabled
          </Text>
        </div>
        <button
          onClick={() => setIsCustomizeOpen(true)}
          className={`${isMobile ? 'flex w-full rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-4 py-3 text-slate-700 dark:text-ink-100 shadow-sm' : 'hidden sm:flex sm:w-auto'} items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-gray-100 hover:text-gray-700`}
        >
          <SettingOutlined />
          Customize view
        </button>
      </div>

      <div ref={gridRef}>
        <WidgetGrid
          ids={widgetOrder}
          width={gridWidth}
          placements={isMobile ? EMPTY_PLACEMENTS : placements}
          defaultWidth={gridWidths}
          onPlacementsChange={setPlacements}
          draggable={!isMobile}
          renderWidget={(id) => (
            <WidgetCollapseProvider
              collapsed={collapsedWidgets.includes(id)}
              onToggle={() => toggleCollapsed(id)}
            >
              {renderJobHuntWidget(
                id,
                stats,
                customWidgets,
                deleteCustomWidget,
                applicationStats?.field_completeness ?? [],
                handleGhost
              )}
            </WidgetCollapseProvider>
          )}
        />
      </div>

      <DashboardCustomizeModal
        open={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        onOpenCreateWidget={() => setIsCreateWidgetOpen(true)}
        availableWidgets={AVAILABLE_WIDGETS}
        enabledWidgets={enabledWidgets}
        toggleWidget={toggleWidget}
        customWidgets={customWidgets}
        onDeleteCustomWidget={handleDeleteCustomWidget}
      />

      <CreateCustomWidgetModal
        open={isCreateWidgetOpen}
        onCancel={() => setIsCreateWidgetOpen(false)}
        onCreate={handleCreateCustomWidget}
        testQuery={testQuery}
      />
    </>
  );
};

export default JobHuntAnalytics;
