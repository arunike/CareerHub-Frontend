import React, { useMemo, useState, useEffect } from 'react';
import { HolderOutlined, SettingOutlined } from '@ant-design/icons';
import { Grid, Typography, message } from 'antd';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCustomWidgets } from '../hooks/useCustomWidgets';
import type { CustomWidget } from '../hooks/useCustomWidgets';
import type { VisualConfig } from '../lib/visualWidgetQuery';
import { AVAILABLE_WIDGETS } from './jobHuntAnalytics/constants';
import DashboardCustomizeModal from './jobHuntAnalytics/DashboardCustomizeModal';
import CreateCustomWidgetModal from './jobHuntAnalytics/CreateCustomWidgetModal';
import {
  getJobHuntWidgetColSpan,
  renderJobHuntWidget,
  type JobHuntStats,
} from './jobHuntAnalytics/widgetRenderer';
import { getApplicationTimelineAnalytics } from '../api/career';

import type { ApplicationStats, ApplicationTimelineAnalytics } from '../types';
const { Text } = Typography;

interface AnalyticsProps {
  applicationStats: ApplicationStats | null;
  selectedYear?: number | 'all';
}

type ValidationResult = NonNullable<CustomWidget['cachedData']>;

const RETIRED_WIDGET_IDS = new Set([
  'response_rate',
  'offer_rate',
  'recent_applications',
  // A different widget from today's Top Locations, which is deliberately 'top_locations':
  // reusing this id would have had every saved selection silently drop the new section.
  'locations',
  'top_companies',
  'work_modes',
]);
// Everything that ever rendered part of this report. Any saved selection containing one of
// these predates the split into per-section widgets, so it is replaced with the full default
// set rather than partially migrated — the sections do not map one-to-one onto the old ids,
// and a half-migrated dashboard is worse than a fresh one.
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
]);
const DEFAULT_WIDGET_IDS = AVAILABLE_WIDGETS.filter((widget) => widget.defaultEnabled).map(
  (widget) => widget.id
);

const normalizeEnabledWidgets = (ids: string[]) => {
  if (ids.some((id) => PRE_SPLIT_WIDGET_IDS.has(id))) {
    // 'outcomes' survives as a section id, so a pre-split list can look partly valid. Only
    // the presence of a pre-split id is trusted to decide this, not the leftovers.
    return DEFAULT_WIDGET_IDS;
  }
  const normalized = ids.filter(
    (id) => AVAILABLE_WIDGET_IDS.has(id) && !RETIRED_WIDGET_IDS.has(id)
  );
  return normalized.length > 0 ? normalized : DEFAULT_WIDGET_IDS;
};

const SortableItem = ({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Hide the original item while dragging
  };

  return (
    <div ref={setNodeRef} style={style} className={`min-w-0 ${className || ''}`}>
      <div className="relative group h-full">
        <div
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${id} widget`}
          className="absolute right-2 top-2 z-10 inline-flex min-h-11 min-w-11 cursor-grab items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-gray-400 opacity-100 shadow-sm transition-opacity hover:text-gray-600 active:cursor-grabbing md:min-h-0 md:min-w-0 md:border-0 md:bg-white/50 md:p-1 md:opacity-0 md:shadow-none md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <HolderOutlined className="w-4 h-4" />
        </div>
        {children}
      </div>
    </div>
  );
};

const JobHuntAnalytics: React.FC<AnalyticsProps> = ({ applicationStats, selectedYear = 'all' }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('job_hunt_analytics_enabled');
    if (saved) {
      try {
        const normalized = normalizeEnabledWidgets(JSON.parse(saved));
        localStorage.setItem('job_hunt_analytics_enabled', JSON.stringify(normalized));
        return normalized;
      } catch (error) {
        console.error('Failed to parse enabled widgets', error);
      }
    }
    return DEFAULT_WIDGET_IDS;
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null);

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('analytics_dashboard_order');
    if (saved) {
      try {
        const order = JSON.parse(saved);
        const normalized = normalizeEnabledWidgets(order);
        return normalized.filter((id: string) => enabledWidgets.includes(id));
      } catch (error) {
        console.error('Failed to parse widget order', error);
      }
    }
    return enabledWidgets;
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isCreateWidgetOpen, setIsCreateWidgetOpen] = useState(false);
  const [timelineAnalytics, setTimelineAnalytics] = useState<ApplicationTimelineAnalytics | null>(
    null
  );
  const [timelineAnalyticsLoading, setTimelineAnalyticsLoading] = useState(false);
  const [timelineAnalyticsError, setTimelineAnalyticsError] = useState(false);

  const { customWidgets, addCustomWidget, deleteCustomWidget, testQuery } = useCustomWidgets(
    'job_hunt_analytics_custom',
    'job-hunt',
    messageApi
  );

  useEffect(() => {
    setWidgetOrder((prev) => {
      const newOrder = prev.filter((id) => enabledWidgets.includes(id));
      const newWidgets = enabledWidgets.filter((id) => !prev.includes(id));
      const updated = [...newOrder, ...newWidgets];
      localStorage.setItem('analytics_dashboard_order', JSON.stringify(updated));
      return updated;
    });
  }, [enabledWidgets]);

  useEffect(() => {
    if (!enabledWidgets.some((id) => ANALYTICS_BACKED_WIDGETS.has(id))) return;

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
  }, [enabledWidgets, selectedYear]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (event.active.rect.current.initial) {
      const { width, height } = event.active.rect.current.initial;
      setActiveSize({ width, height });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over!.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('analytics_dashboard_order', JSON.stringify(newItems));
        return newItems;
      });
    } else {
      localStorage.setItem('analytics_dashboard_order', JSON.stringify(widgetOrder));
    }
    setActiveId(null);
  };

  const toggleWidget = (widgetId: string) => {
    setEnabledWidgets((prev) => {
      let newEnabled: string[];
      if (prev.includes(widgetId)) {
        if (prev.length === 1) {
          return prev;
        }
        newEnabled = prev.filter((id) => id !== widgetId);
      } else {
        newEnabled = [...prev, widgetId];
      }
      localStorage.setItem('job_hunt_analytics_enabled', JSON.stringify(newEnabled));
      return newEnabled;
    });
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

    const updatedEnabled = [...enabledWidgets, customWidget.id];
    setEnabledWidgets(updatedEnabled);
    localStorage.setItem('job_hunt_analytics_enabled', JSON.stringify(updatedEnabled));

    setIsCreateWidgetOpen(false);
    messageApi.success('Custom widget created!');
  };

  const handleDeleteCustomWidget = (id: string) => {
    deleteCustomWidget(id);
    setEnabledWidgets((prev) => prev.filter((wId) => wId !== id));
  };

  // The server already counted all of this; the browser only renames the fields. It used
  // to download every application to count them itself, which was the slow part of the page.
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
          <Text className="text-gray-500">
            {enabledWidgets.length} widget{enabledWidgets.length !== 1 ? 's' : ''} enabled
          </Text>
        </div>
        <button
          onClick={() => setIsCustomizeOpen(true)}
          className={`${isMobile ? 'flex w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm' : 'hidden sm:flex sm:w-auto'} items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-gray-100 hover:text-gray-700`}
        >
          <SettingOutlined />
          Customize view
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {widgetOrder.map((id) => (
              <SortableItem key={id} id={id} className={getJobHuntWidgetColSpan(id, customWidgets)}>
                {renderJobHuntWidget(id, stats, customWidgets, deleteCustomWidget)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div
              className={`h-full ${getJobHuntWidgetColSpan(activeId, customWidgets)}`}
              style={
                activeSize ? { width: activeSize.width, height: activeSize.height } : undefined
              }
            >
              {renderJobHuntWidget(activeId, stats, customWidgets, deleteCustomWidget)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
