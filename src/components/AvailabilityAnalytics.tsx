import React, { useState, useEffect } from 'react';
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
import DashboardCustomizeModal from './jobHuntAnalytics/DashboardCustomizeModal';
import { AVAILABLE_WIDGETS } from './availabilityAnalytics/constants';
import CreateAvailabilityWidgetModal from './availabilityAnalytics/CreateAvailabilityWidgetModal';
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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
    return AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id);
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null);

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('availability_analytics_order');
    if (saved) {
      try {
        const order = JSON.parse(saved);
        // Filter to only include enabled widgets
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
  } = useCustomWidgets('availability_analytics_custom', 'availability', messageApi);

  const [newWidgetName, setNewWidgetName] = useState('');
  const [newWidgetQuery, setNewWidgetQuery] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [newWidgetIcon, setNewWidgetIcon] = useState('CalendarOutlined');
  const [newWidgetColor, setNewWidgetColor] = useState('blue');

  // Update order when enabled widgets change
  useEffect(() => {
    setWidgetOrder(prev => {
      const newOrder = prev.filter(id => enabledWidgets.includes(id));
      const newWidgets = enabledWidgets.filter(id => !prev.includes(id));
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
        localStorage.setItem('availability_analytics_order', JSON.stringify(newItems));
        return newItems;
      });
    } else {
      // Even if order didn't change at the end (because we updated during drag),
      // make sure to save the current state
      localStorage.setItem('availability_analytics_order', JSON.stringify(widgetOrder));
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
      localStorage.setItem('availability_analytics_enabled', JSON.stringify(newEnabled));
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
      messageApi.error('Query failed');
      console.error('Query failed', error);
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
    localStorage.setItem('availability_analytics_enabled', JSON.stringify(updatedEnabled));

    // Reset form
    setNewWidgetName('');
    setNewWidgetQuery('');
    setValidationResult(null);
    setNewWidgetIcon('CalendarOutlined');
    setNewWidgetColor('blue');
    setIsCreateWidgetOpen(false);

    messageApi.success('Custom widget created!');
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 animate-in fade-in duration-500 items-start">
            {widgetOrder.map((id) => (
              <SortableItem key={id} id={id} className={getAvailabilityWidgetClass(id, customWidgets)}>
                {renderAvailabilityWidget(id, stats, customWidgets, deleteCustomWidget)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div 
              className={`h-full ${getAvailabilityWidgetClass(activeId, customWidgets)}`}
              style={activeSize ? { width: activeSize.width, height: activeSize.height } : undefined}
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
      />

      <CreateAvailabilityWidgetModal
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

export default AvailabilityAnalytics;
