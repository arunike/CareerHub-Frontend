import React, { useState, useEffect } from 'react';
import { HolderOutlined, SettingOutlined } from '@ant-design/icons';
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
import DashboardCustomizeModal from './jobHuntAnalytics/DashboardCustomizeModal';
import { AVAILABLE_WIDGETS } from './availabilityAnalytics/constants';
import CreateCustomWidgetModal from './jobHuntAnalytics/CreateCustomWidgetModal';
import type { VisualConfig } from '../lib/visualWidgetQuery';
import {
  getAvailabilityWidgetClass,
  renderAvailabilityWidget,
  type AvailabilityStats,
} from './availabilityAnalytics/widgetRenderer';

const { Text } = Typography;

interface AvailabilityAnalyticsProps {
  stats: AvailabilityStats;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
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

const AvailabilityAnalytics: React.FC<AvailabilityAnalyticsProps> = ({ stats }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('availability_analytics_enabled');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse enabled widgets', error);
      }
    }
    return AVAILABLE_WIDGETS.filter((w) => w.defaultEnabled).map((w) => w.id);
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null);

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('availability_analytics_order');
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

  const { customWidgets, addCustomWidget, deleteCustomWidget, testQuery } = useCustomWidgets(
    'availability_analytics_custom',
    'availability',
    messageApi
  );

  useEffect(() => {
    setWidgetOrder((prev) => {
      const newOrder = prev.filter((id) => enabledWidgets.includes(id));
      const newWidgets = enabledWidgets.filter((id) => !prev.includes(id));
      const updated = [...newOrder, ...newWidgets];
      localStorage.setItem('availability_analytics_order', JSON.stringify(updated));
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
        localStorage.setItem('availability_analytics_order', JSON.stringify(newItems));
        return newItems;
      });
    } else {
      localStorage.setItem('availability_analytics_order', JSON.stringify(widgetOrder));
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
      localStorage.setItem('availability_analytics_enabled', JSON.stringify(newEnabled));
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
    cachedData: any;
  }) => {
    const customWidget: any = {
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
    localStorage.setItem('availability_analytics_enabled', JSON.stringify(updatedEnabled));

    setIsCreateWidgetOpen(false);
    messageApi.success('Custom widget created!');
  };

  const handleDeleteCustomWidget = (id: string) => {
    deleteCustomWidget(id);
    setEnabledWidgets((prev) => prev.filter((wId) => wId !== id));
  };

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
          type="button"
          onClick={() => setIsCustomizeOpen(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 sm:w-auto"
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 animate-in fade-in duration-500 items-start">
            {widgetOrder.map((id) => (
              <SortableItem
                key={id}
                id={id}
                className={getAvailabilityWidgetClass(id, customWidgets)}
              >
                {renderAvailabilityWidget(id, stats, customWidgets, deleteCustomWidget)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div
              className={`h-full ${getAvailabilityWidgetClass(activeId, customWidgets)}`}
              style={
                activeSize ? { width: activeSize.width, height: activeSize.height } : undefined
              }
            >
              {renderAvailabilityWidget(activeId, stats, customWidgets, deleteCustomWidget)}
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
        initialDataSource="events"
      />
    </>
  );
};

export default AvailabilityAnalytics;
