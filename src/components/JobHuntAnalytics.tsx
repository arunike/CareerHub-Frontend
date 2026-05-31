import React, { useMemo, useState, useEffect } from 'react';
import { HolderOutlined, SettingOutlined } from '@ant-design/icons';
import { Grid, Typography, message } from 'antd';
import { parseDateOnlyLocal } from '../utils/dateOnly';
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

import type { ApplicationTimelineAnalytics } from '../types';
import type { CareerApplication } from '../types/application';
const { Text } = Typography;

interface AnalyticsProps {
  applications: CareerApplication[];
}

type ValidationResult = NonNullable<CustomWidget['cachedData']>;

const INACTIVE_STATUSES = new Set([
  'APPLIED',
  'REJECTED',
  'GHOSTED',
  'ACCEPTED',
  'REMOVED_FROM_SHEET',
]);
const RESPONDED_EXCLUDE_STATUSES = new Set(['APPLIED', 'GHOSTED', 'REMOVED_FROM_SHEET']);
const RETIRED_WIDGET_IDS = new Set([
  'response_rate',
  'offer_rate',
  'recent_applications',
  'locations',
  'top_companies',
  'work_modes',
]);
const PIPELINE_BREAKDOWN_SOURCE_IDS = new Set(['locations']);
const AVAILABLE_WIDGET_IDS = new Set(AVAILABLE_WIDGETS.map((widget) => widget.id));
const DEFAULT_WIDGET_IDS = AVAILABLE_WIDGETS.filter((widget) => widget.defaultEnabled).map(
  (widget) => widget.id
);

const normalizeEnabledWidgets = (ids: string[]) => {
  const normalized = ids.filter(
    (id) => AVAILABLE_WIDGET_IDS.has(id) && !RETIRED_WIDGET_IDS.has(id)
  );
  if (
    ids.some((id) => PIPELINE_BREAKDOWN_SOURCE_IDS.has(id)) &&
    !normalized.includes('pipeline_breakdown')
  ) {
    normalized.push('pipeline_breakdown');
  }
  return normalized.length > 0 ? normalized : DEFAULT_WIDGET_IDS;
};

const getApplicationRound = (application: CareerApplication) => {
  const roundStatus = application.status.match(/^ROUND_(\d+)$/);
  if (roundStatus) return Number(roundStatus[1]);
  return application.current_round || 0;
};

const formatStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    APPLIED: 'Applied',
    OA: 'Online Assessment',
    SCREEN: 'Phone Screen',
    ROUND_1: '1st Round',
    ROUND_2: '2nd Round',
    ROUND_3: '3rd Round',
    ROUND_4: '4th Round',
    ONSITE: 'Onsite',
    OFFER: 'Offer',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    GHOSTED: 'Ghosted',
    REMOVED_FROM_SHEET: 'Removed',
  };
  return (
    labels[status] ||
    status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
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
    <div ref={setNodeRef} style={style} className={className}>
      <div className="relative group h-full">
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/50 rounded"
        >
          <HolderOutlined className="w-4 h-4" />
        </div>
        {children}
      </div>
    </div>
  );
};

const JobHuntAnalytics: React.FC<AnalyticsProps> = ({ applications }) => {
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
    const migrationKey = 'job_hunt_analytics_timeline_widget_added';
    if (localStorage.getItem(migrationKey)) return;

    setEnabledWidgets((prev) => {
      if (prev.includes('timeline_analytics')) return prev;
      const updated = [...prev, 'timeline_analytics'];
      localStorage.setItem('job_hunt_analytics_enabled', JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem(migrationKey, 'true');
  }, []);

  useEffect(() => {
    if (!enabledWidgets.includes('timeline_analytics')) return;

    let mounted = true;
    setTimelineAnalyticsLoading(true);
    setTimelineAnalyticsError(false);
    getApplicationTimelineAnalytics()
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
  }, [enabledWidgets]);

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

  const stats: JobHuntStats = useMemo(() => {
    const total = applications.length;
    const rejections = applications.filter((a) => a.status === 'REJECTED').length;
    const offers = applications.filter((a) => a.status === 'OFFER').length;
    const ghosted = applications.filter((a) => a.status === 'GHOSTED').length;

    const activeInterviews = applications.filter((a) => !INACTIVE_STATUSES.has(a.status)).length;

    const totalInterviews = applications.filter(
      (a) =>
        (!RESPONDED_EXCLUDE_STATUSES.has(a.status) && a.status !== 'REJECTED') ||
        (a.status === 'REJECTED' && getApplicationRound(a) > 0)
    ).length;

    const interviewRate = total > 0 ? ((totalInterviews / total) * 100).toFixed(1) : '0.0';
    const respondedCount = applications.filter(
      (a) => !RESPONDED_EXCLUDE_STATUSES.has(a.status)
    ).length;
    const responseRate = total > 0 ? ((respondedCount / total) * 100).toFixed(1) : '0.0';
    const offerRate = total > 0 ? ((offers / total) * 100).toFixed(1) : '0.0';

    const locationCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const ageCounts: Record<string, number> = {
      'Last 7 days': 0,
      '8-30 days': 0,
      '31-90 days': 0,
      '90+ days': 0,
      Undated: 0,
    };
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    applications.forEach((a) => {
      let loc = (a.office_location || a.location || '').trim();
      if (!loc) loc = 'Unknown';
      loc = loc.split(',')[0].trim();
      if (loc.toLowerCase().includes('remote')) loc = 'Remote';
      loc = loc.charAt(0).toUpperCase() + loc.slice(1);
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;

      const statusLabel = formatStatusLabel(a.status);
      statusCounts[statusLabel] = (statusCounts[statusLabel] || 0) + 1;

      const sourceDate = a.date_applied || a.created_at;
      const timestamp = sourceDate
        ? (parseDateOnlyLocal(sourceDate)?.getTime() ?? new Date(sourceDate).getTime())
        : Number.NaN;
      if (Number.isNaN(timestamp)) {
        ageCounts.Undated += 1;
      } else {
        const ageDays = Math.max(0, Math.floor((now - timestamp) / DAY_MS));
        if (ageDays <= 7) ageCounts['Last 7 days'] += 1;
        else if (ageDays <= 30) ageCounts['8-30 days'] += 1;
        else if (ageDays <= 90) ageCounts['31-90 days'] += 1;
        else ageCounts['90+ days'] += 1;
      }
    });

    const locations = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const statusBreakdown = Object.entries(statusCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const applicationAgeBreakdown = Object.entries(ageCounts)
      .map(([name, count]) => ({ name, count }))
      .filter((row) => row.count > 0);

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const recentApplications30d = applications.filter((a) => {
      const sourceDate = a.date_applied || a.created_at;
      if (!sourceDate) return false;
      const timestamp = parseDateOnlyLocal(sourceDate)?.getTime() ?? new Date(sourceDate).getTime();
      return !Number.isNaN(timestamp) && now - timestamp <= THIRTY_DAYS_MS;
    }).length;

    return {
      total,
      rejections,
      offers,
      ghosted,
      activeInterviews,
      totalInterviews,
      interviewRate,
      responseRate,
      respondedCount,
      offerRate,
      recentApplications30d,
      locations,
      statusBreakdown,
      applicationAgeBreakdown,
      timelineAnalytics,
      timelineAnalyticsLoading,
      timelineAnalyticsError,
    };
  }, [applications, timelineAnalytics, timelineAnalyticsLoading, timelineAnalyticsError]);

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
          Customize Dashboard
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
