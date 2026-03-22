import React, { useMemo, useState, useEffect } from 'react';
import {
  HolderOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Typography, message } from 'antd';
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
import { AVAILABLE_WIDGETS } from './jobHuntAnalytics/constants';
import DashboardCustomizeModal from './jobHuntAnalytics/DashboardCustomizeModal';
import CreateCustomWidgetModal from './jobHuntAnalytics/CreateCustomWidgetModal';
import {
  getJobHuntWidgetColSpan,
  renderJobHuntWidget,
  type JobHuntStats,
} from './jobHuntAnalytics/widgetRenderer';

import type { CareerApplication } from '../types/application';
const { Text } = Typography;

interface AnalyticsProps {
  applications: CareerApplication[];
}

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

const JobHuntAnalytics: React.FC<AnalyticsProps> = ({ applications }) => {
  const [messageApi, contextHolder] = message.useMessage();
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

  const {
    customWidgets,
    addCustomWidget,
    deleteCustomWidget,
    testQuery
  } = useCustomWidgets('job_hunt_analytics_custom', 'job-hunt', messageApi);

  const [newWidgetName, setNewWidgetName] = useState('');
  const [newWidgetQuery, setNewWidgetQuery] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
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

    const customWidget: any = {
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
    const offers = applications.filter(
      (a) => a.status === 'OFFER' || a.status === 'ACCEPTED'
    ).length;
    const ghosted = applications.filter((a) => a.status === 'GHOSTED').length;

    // 2. Interview Stats
    const activeInterviews = applications.filter((a) =>
      ['SCREEN', 'OA', 'ONSITE'].includes(a.status)
    ).length;

    const totalInterviews = applications.filter(
      (a) =>
        ['SCREEN', 'OA', 'ONSITE', 'OFFER', 'ACCEPTED'].includes(a.status) ||
        (a.status === 'REJECTED' && (a.current_round || 0) > 0)
    ).length;

    const interviewRate = total > 0 ? ((totalInterviews / total) * 100).toFixed(1) : '0.0';

    // 3. Dynamic Location Stats
    const locationCounts: Record<string, number> = {};
    applications.forEach((a) => {
      let loc = (a.location || '').trim();
      if (!loc) loc = 'Unknown';
      loc = loc.split(',')[0].trim();
      if (loc.toLowerCase().includes('remote')) loc = 'Remote';
      loc = loc.charAt(0).toUpperCase() + loc.slice(1);
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const locations = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

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
    const funnelSteps = { APPLIED: 0, OA: 0, SCREEN: 0, ONSITE: 0, OFFER: 0, ACCEPTED: 0 };

    applications.forEach((a) => {
      const status = a.status as string;
      if (Object.prototype.hasOwnProperty.call(funnelSteps, status)) {
        funnelSteps[status as keyof typeof funnelSteps]++;
      }

      if (['OFFER', 'ACCEPTED'].includes(status) && a.offer && a.date_applied) {
        try {
          const offerDate = new Date((a.offer as any).created_at);
          const appliedDate = new Date(a.date_applied as string);
          if (!isNaN(offerDate.getTime()) && !isNaN(appliedDate.getTime())) {
            const days = Math.floor((offerDate.getTime() - appliedDate.getTime()) / (1000 * 3600 * 24));
            if (days >= 0) {
              daysToOfferSum += days;
              daysToOfferCount++;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    });

    const avgDaysToOffer = daysToOfferCount > 0 ? Math.round(daysToOfferSum / daysToOfferCount) : null;
    const funnel = [
      { label: 'Applied', value: funnelSteps.APPLIED, color: 'bg-blue-100 border-blue-300 text-blue-700' },
      { label: 'OA', value: funnelSteps.OA, color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
      { label: 'Screen', value: funnelSteps.SCREEN, color: 'bg-purple-100 border-purple-300 text-purple-700' },
      { label: 'Onsite', value: funnelSteps.ONSITE, color: 'bg-pink-100 border-pink-300 text-pink-700' },
      { label: 'Offer', value: funnelSteps.OFFER, color: 'bg-green-100 border-green-300 text-green-700' },
      { label: 'Accepted', value: funnelSteps.ACCEPTED, color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
    ];

    return {
      total,
      rejections,
      offers,
      ghosted,
      activeInterviews,
      totalInterviews,
      interviewRate,
      locations,
      rounds,
      funnel,
      avgDaysToOffer,
    };
  }, [applications]);

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
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
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
