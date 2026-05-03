import React, { useMemo, useState, useEffect } from 'react';
import {
  HolderOutlined,
  SettingOutlined,
} from '@ant-design/icons';
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
import { AVAILABLE_WIDGETS } from './jobHuntAnalytics/constants';
import DashboardCustomizeModal from './jobHuntAnalytics/DashboardCustomizeModal';
import CreateCustomWidgetModal from './jobHuntAnalytics/CreateCustomWidgetModal';
import {
  getJobHuntWidgetColSpan,
  renderJobHuntWidget,
  type JobHuntStats,
} from './jobHuntAnalytics/widgetRenderer';
import { getApplicationTimelineAnalytics } from '../api/career';

import type { ApplicationTimelineAnalytics, UserSettings } from '../types';
import type { CareerApplication } from '../types/application';
const { Text } = Typography;

type ApplicationStage = NonNullable<UserSettings['application_stages']>[number];

interface AnalyticsProps {
  applications: CareerApplication[];
  applicationStages?: ApplicationStage[];
}

type ValidationResult = NonNullable<CustomWidget['cachedData']>;

const DEFAULT_APPLICATION_STAGES: ApplicationStage[] = [
  { key: 'APPLIED', label: 'Applied', shortLabel: 'Apply', tone: 'bg-blue-500' },
  { key: 'OA', label: 'Online Assessment', shortLabel: 'OA', tone: 'bg-violet-500' },
  { key: 'SCREEN', label: 'Phone Screen', shortLabel: 'Phone', tone: 'bg-sky-500' },
  { key: 'ROUND_1', label: '1st Round', shortLabel: 'R1', tone: 'bg-amber-400' },
  { key: 'ROUND_2', label: '2nd Round', shortLabel: 'R2', tone: 'bg-amber-500' },
  { key: 'ROUND_3', label: '3rd Round', shortLabel: 'R3', tone: 'bg-orange-500' },
  { key: 'ROUND_4', label: '4th Round', shortLabel: 'R4', tone: 'bg-orange-600' },
  { key: 'ONSITE', label: 'Onsite Interview', shortLabel: 'Onsite', tone: 'bg-red-500' },
  { key: 'OFFER', label: 'Offer', shortLabel: 'Offer', tone: 'bg-emerald-500' },
  { key: 'REJECTED', label: 'Rejected', shortLabel: 'Reject', tone: 'bg-rose-500' },
  { key: 'GHOSTED', label: 'Ghosted', shortLabel: 'Ghost', tone: 'bg-slate-400' },
];

const NON_FUNNEL_STATUSES = new Set(['ACCEPTED', 'REJECTED', 'GHOSTED']);
const INACTIVE_STATUSES = new Set(['APPLIED', 'REJECTED', 'GHOSTED', 'ACCEPTED']);
const RESPONDED_EXCLUDE_STATUSES = new Set(['APPLIED', 'GHOSTED']);

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getStageLabel = (stage: ApplicationStage) => {
  if (/^ROUND_\d+$/.test(stage.key)) {
    return stage.label || toTitleCase(stage.key);
  }
  return stage.shortLabel || stage.label || toTitleCase(stage.key);
};

const getStageColor = (stage: ApplicationStage) => {
  const color = stage.tone?.match(/bg-([a-z]+)-/)?.[1] || 'gray';
  const palette: Record<string, string> = {
    blue: 'bg-blue-100 border-blue-300 text-blue-700',
    violet: 'bg-violet-100 border-violet-300 text-violet-700',
    purple: 'bg-purple-100 border-purple-300 text-purple-700',
    sky: 'bg-sky-100 border-sky-300 text-sky-700',
    cyan: 'bg-cyan-100 border-cyan-300 text-cyan-700',
    amber: 'bg-amber-100 border-amber-300 text-amber-700',
    orange: 'bg-orange-100 border-orange-300 text-orange-700',
    red: 'bg-red-100 border-red-300 text-red-700',
    rose: 'bg-rose-100 border-rose-300 text-rose-700',
    pink: 'bg-pink-100 border-pink-300 text-pink-700',
    emerald: 'bg-emerald-100 border-emerald-300 text-emerald-700',
    green: 'bg-green-100 border-green-300 text-green-700',
    slate: 'bg-slate-100 border-slate-300 text-slate-700',
    gray: 'bg-gray-100 border-gray-300 text-gray-700',
  };
  return palette[color] || palette.gray;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Hide the original item while dragging
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      {/* Grip handle for dragging, only visible on hover of the component ideally, but for now static */}
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

const JobHuntAnalytics: React.FC<AnalyticsProps> = ({ applications, applicationStages = DEFAULT_APPLICATION_STAGES }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('job_hunt_analytics_enabled');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse enabled widgets', error);
      }
    }
    return AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id);
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null);

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('analytics_dashboard_order');
    if (saved) {
      try {
        const order = JSON.parse(saved);
        return order.filter((id: string) => enabledWidgets.includes(id));
      } catch (error) {
        console.error('Failed to parse widget order', error);
      }
    }
    return enabledWidgets;
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isCreateWidgetOpen, setIsCreateWidgetOpen] = useState(false);
  const [timelineAnalytics, setTimelineAnalytics] = useState<ApplicationTimelineAnalytics | null>(null);
  const [timelineAnalyticsLoading, setTimelineAnalyticsLoading] = useState(false);

  const {
    customWidgets,
    addCustomWidget,
    deleteCustomWidget,
    testQuery
  } = useCustomWidgets('job_hunt_analytics_custom', 'job-hunt', messageApi);

  const [newWidgetName, setNewWidgetName] = useState('');
  const [newWidgetQuery, setNewWidgetQuery] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [newWidgetIcon, setNewWidgetIcon] = useState('FileTextOutlined');
  const [newWidgetColor, setNewWidgetColor] = useState('blue');

  // Update order when enabled widgets change
  useEffect(() => {
    setWidgetOrder(prev => {
      const newOrder = prev.filter(id => enabledWidgets.includes(id));
      const newWidgets = enabledWidgets.filter(id => !prev.includes(id));
      const updated = [...newOrder, ...newWidgets];
      localStorage.setItem('analytics_dashboard_order', JSON.stringify(updated));
      return updated;
    });
  }, [enabledWidgets]);

  useEffect(() => {
    const migrationKey = 'job_hunt_analytics_timeline_widget_added';
    if (localStorage.getItem(migrationKey)) return;

    setEnabledWidgets(prev => {
      if (prev.includes('timeline_analytics')) return prev;
      const updated = [...prev, 'timeline_analytics'];
      localStorage.setItem('job_hunt_analytics_enabled', JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem(migrationKey, 'true');
  }, []);

  useEffect(() => {
    let mounted = true;
    setTimelineAnalyticsLoading(true);
    getApplicationTimelineAnalytics()
      .then((response) => {
        if (mounted) {
          setTimelineAnalytics(response.data);
        }
      })
      .catch((error) => {
        console.error('Failed to load timeline analytics', error);
      })
      .finally(() => {
        if (mounted) {
          setTimelineAnalyticsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Capture the initial dimensions of the dragged item
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
      // Even if order didn't change at the end (because we updated during drag),
      // make sure to save the current state
      localStorage.setItem('analytics_dashboard_order', JSON.stringify(widgetOrder));
    }
    setActiveId(null);
  };

  const toggleWidget = (widgetId: string) => {
    setEnabledWidgets(prev => {
      let newEnabled: string[];
      if (prev.includes(widgetId)) {
        // Prevent disabling all widgets
        if (prev.length === 1) {
          return prev;
        }
        newEnabled = prev.filter(id => id !== widgetId);
      } else {
        newEnabled = [...prev, widgetId];
      }
      localStorage.setItem('job_hunt_analytics_enabled', JSON.stringify(newEnabled));
      return newEnabled;
    });
  };

  const handleTestQuery = async () => {
    if (!newWidgetQuery.trim()) return;
    
    setIsValidating(true);
    setValidationResult(null);
    try {
      const data = await testQuery(newWidgetQuery);
      setValidationResult(data);
      messageApi.success('Query successful!');
    } catch (error) {
      console.error('Query failed', error);
      messageApi.error('Query failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateCustomWidget = () => {
    if (!newWidgetName.trim()) {
      messageApi.error('Please enter a widget name');
      return;
    }
    if (!validationResult) {
      messageApi.error('Please test your query first');
      return;
    }

    const customWidget: CustomWidget = {
      id: `custom-${Date.now()}`,
      name: newWidgetName.trim(),
      query: newWidgetQuery,
      widgetType: validationResult.type,
      icon: newWidgetIcon,
      color: newWidgetColor,
      createdAt: new Date().toISOString(),
      cachedData: validationResult,
    };

    addCustomWidget(customWidget);

    // Enable the new widget
    const updatedEnabled = [...enabledWidgets, customWidget.id];
    setEnabledWidgets(updatedEnabled);
    localStorage.setItem('job_hunt_analytics_enabled', JSON.stringify(updatedEnabled));

    // Reset form
    setNewWidgetName('');
    setNewWidgetQuery('');
    setValidationResult(null);
    setNewWidgetIcon('FileTextOutlined');
    setNewWidgetColor('blue');
    setIsCreateWidgetOpen(false);

    messageApi.success('Custom widget created!');
  };

  const stats: JobHuntStats = useMemo(() => {
    // 1. Basic Counts
    const total = applications.length;
    const rejections = applications.filter((a) => a.status === 'REJECTED').length;
    const offers = applications.filter((a) => a.status === 'OFFER').length;
    const ghosted = applications.filter((a) => a.status === 'GHOSTED').length;

    // 2. Interview Stats
    const activeInterviews = applications.filter((a) =>
      !INACTIVE_STATUSES.has(a.status)
    ).length;

    const totalInterviews = applications.filter(
      (a) =>
        (!RESPONDED_EXCLUDE_STATUSES.has(a.status) && a.status !== 'REJECTED') ||
        (a.status === 'REJECTED' && (a.current_round || 0) > 0)
    ).length;

    const interviewRate = total > 0 ? ((totalInterviews / total) * 100).toFixed(1) : '0.0';
    const respondedCount = applications.filter((a) =>
      !RESPONDED_EXCLUDE_STATUSES.has(a.status)
    ).length;
    const responseRate = total > 0 ? ((respondedCount / total) * 100).toFixed(1) : '0.0';
    const offerRate = total > 0 ? ((offers / total) * 100).toFixed(1) : '0.0';

    // 3. Dynamic Location Stats
    const locationCounts: Record<string, number> = {};
    const companyCounts: Record<string, number> = {};
    const workModeCounts: Record<string, number> = {
      Remote: 0,
      Hybrid: 0,
      Onsite: 0,
      Unknown: 0,
    };

    applications.forEach((a) => {
      let loc = ((a.office_location || a.location) || '').trim();
      if (!loc) loc = 'Unknown';
      loc = loc.split(',')[0].trim();
      if (loc.toLowerCase().includes('remote')) loc = 'Remote';
      loc = loc.charAt(0).toUpperCase() + loc.slice(1);
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;

      const companyName = (a.company_details?.name || 'Unknown').trim() || 'Unknown';
      companyCounts[companyName] = (companyCounts[companyName] || 0) + 1;

      const workMode = (() => {
        const value = (a.rto_policy || 'UNKNOWN').toString().toUpperCase();
        if (value === 'REMOTE') return 'Remote';
        if (value === 'HYBRID') return 'Hybrid';
        if (value === 'ONSITE') return 'Onsite';
        return 'Unknown';
      })();
      workModeCounts[workMode] = (workModeCounts[workMode] || 0) + 1;
    });

    const locations = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const topCompanies = Object.entries(companyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const workModes = [
      { name: 'Remote', count: workModeCounts.Remote, color: 'bg-emerald-500' },
      { name: 'Hybrid', count: workModeCounts.Hybrid, color: 'bg-amber-500' },
      { name: 'Onsite', count: workModeCounts.Onsite, color: 'bg-rose-500' },
      { name: 'Unknown', count: workModeCounts.Unknown, color: 'bg-slate-400' },
    ];

    // 4. Dynamic Round Stats
    const roundCounts: Record<string, number> = {};
    applications.forEach((a) => {
      const r = a.current_round || 0;
      if (r > 0) {
        const label = `Round ${r}`;
        roundCounts[label] = (roundCounts[label] || 0) + 1;
      }
    });

    const rounds = Object.entries(roundCounts)
      .map(([name, count]) => ({
        name,
        count,
        roundNum: parseInt(name.replace('Round ', '')),
      }))
      .sort((a, b) => a.roundNum - b.roundNum)
      .map(({ name, count }) => ({ name, count }));

    // 5. Funnel & Avg Days
    let daysToOfferSum = 0;
    let daysToOfferCount = 0;
    const stageMap = new Map<string, ApplicationStage>();
    const configuredStages = applicationStages.length ? applicationStages : DEFAULT_APPLICATION_STAGES;
    configuredStages.forEach((stage) => {
      if (stage.key && !stageMap.has(stage.key)) {
        stageMap.set(stage.key, stage);
      }
    });

    applications.forEach((a) => {
      if (!stageMap.has(a.status)) {
        stageMap.set(a.status, {
          key: a.status,
          label: toTitleCase(a.status),
          shortLabel: toTitleCase(a.status),
          tone: 'bg-gray-500',
        });
      }
    });

    const funnelSteps: Record<string, number> = {};
    Array.from(stageMap.keys()).forEach((status) => {
      funnelSteps[status] = 0;
    });
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const recentApplications30d = applications.filter((a) => {
      const sourceDate = a.date_applied || a.created_at;
      if (!sourceDate) return false;
      const timestamp = new Date(sourceDate).getTime();
      return !Number.isNaN(timestamp) && now - timestamp <= THIRTY_DAYS_MS;
    }).length;

    applications.forEach((a) => {
      const status = a.status as string;
      if (Object.prototype.hasOwnProperty.call(funnelSteps, status)) {
        funnelSteps[status]++;
      }

      if (status === 'OFFER' && a.offer && a.date_applied) {
        try {
          const offer = a.offer as { created_at?: string };
          const offerDate = new Date(offer.created_at || '');
          const appliedDate = new Date(a.date_applied as string);
          if (!isNaN(offerDate.getTime()) && !isNaN(appliedDate.getTime())) {
            const days = Math.floor((offerDate.getTime() - appliedDate.getTime()) / (1000 * 3600 * 24));
            if (days >= 0) {
              daysToOfferSum += days;
              daysToOfferCount++;
            }
          }
        } catch {
          // ignore
        }
      }
    });

    const avgDaysToOffer = daysToOfferCount > 0 ? Math.round(daysToOfferSum / daysToOfferCount) : null;
    const funnel = Array.from(stageMap.values())
      .filter((stage) => !NON_FUNNEL_STATUSES.has(stage.key) || (funnelSteps[stage.key] || 0) > 0)
      .map((stage) => ({
        label: getStageLabel(stage),
        value: funnelSteps[stage.key] || 0,
        color: getStageColor(stage),
      }));

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
      topCompanies,
      workModes,
      rounds,
      funnel,
      avgDaysToOffer,
      avgDaysToOfferSampleSize: daysToOfferCount,
      timelineAnalytics,
      timelineAnalyticsLoading,
    };
  }, [applications, applicationStages, timelineAnalytics, timelineAnalyticsLoading]);

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
              style={activeSize ? { width: activeSize.width, height: activeSize.height } : undefined}
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
      />

      <CreateCustomWidgetModal
        open={isCreateWidgetOpen}
        onCancel={() => setIsCreateWidgetOpen(false)}
        onCreate={handleCreateCustomWidget}
        newWidgetName={newWidgetName}
        setNewWidgetName={setNewWidgetName}
        newWidgetQuery={newWidgetQuery}
        setNewWidgetQuery={setNewWidgetQuery}
        isValidating={isValidating}
        onTestQuery={handleTestQuery}
        validationResult={validationResult}
        newWidgetIcon={newWidgetIcon}
        setNewWidgetIcon={setNewWidgetIcon}
        newWidgetColor={newWidgetColor}
        setNewWidgetColor={setNewWidgetColor}
      />
    </>
  );
};

export default JobHuntAnalytics;
