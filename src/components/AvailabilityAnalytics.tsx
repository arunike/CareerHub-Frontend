import React, { useState, useEffect } from 'react';
import {
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  PieChartOutlined,
  HolderOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { Modal, Button, Switch, Typography, Input, message } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import CustomWidgetCard from './CustomWidgetCard';

const { Text } = Typography;

const COLORS = ['#1890ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultEnabled: boolean;
  category: 'statistic' | 'chart';
}

const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: 'total',
    name: 'Total Events',
    description: 'Total number of events tracked',
    icon: <CalendarOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'weekly',
    name: 'Events This Week',
    description: 'Number of events this week',
    icon: <RiseOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'duration',
    name: 'Average Duration',
    description: 'Average event duration in minutes',
    icon: <ClockCircleOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'category',
    name: 'Events by Category',
    description: 'Breakdown of events by category',
    icon: <PieChartOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'activity',
    name: 'Daily Activity',
    description: 'Daily event count and duration',
    icon: <BarChartOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

interface AvailabilityStats {
  totalEvents: number;
  thisWeek: number;
  avgDuration: number;
  byCategory: { name: string; value: number }[];
  dailyActivity: { date: string; count: number; minutes: number }[];
}

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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('availability_analytics_enabled');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        message.error('Failed to parse enabled widgets');
        console.error('Failed to parse enabled widgets', error);
      }
    }
    return AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id);
  });

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('availability_analytics_order');
    if (saved) {
      try {
        const order = JSON.parse(saved);
        // Filter to only include enabled widgets
        return order.filter((id: string) => enabledWidgets.includes(id));
      } catch (error) {
        message.error('Failed to parse widget order');
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
  } = useCustomWidgets('availability_analytics_custom', 'availability');

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
    }
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
      message.success('Query successful!');
    } catch (error) {
      message.error('Query failed');
      console.error('Query failed', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateCustomWidget = () => {
    if (!newWidgetName.trim()) {
      message.error('Please enter a widget name');
      return;
    }
    if (!validationResult) {
      message.error('Please test your query first');
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

    message.success('Custom widget created!');
  };



  const renderWidget = (id: string) => {
    switch (id) {
      case 'total':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <CalendarOutlined className="text-2xl text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </div>
        );
      case 'weekly':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                <RiseOutlined className="text-2xl text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Events This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
              </div>
            </div>
          </div>
        );
      case 'duration':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
                <ClockCircleOutlined className="text-2xl text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgDuration} min</p>
              </div>
            </div>
          </div>
        );
      case 'category':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-6">
              <PieChartOutlined className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Events by Category</h3>
            </div>
            <div className="h-75 w-full">
              {stats.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`
                      }
                    >
                      {stats.byCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No category data available
                </div>
              )}
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-6">
              <BarChartOutlined className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Daily Activity (Last 7 Days)</h3>
            </div>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#1890ff" />
                  <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Events"
                    fill="#1890ff"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="minutes"
                    name="Minutes"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      default: {
        // Check if it's a custom widget
        const customWidget = customWidgets.find(w => w.id === id);
        if (customWidget) {
          return <CustomWidgetCard widget={customWidget} onDelete={deleteCustomWidget} />;
        }
        return null;
      }
    }
  };

  const getItemClass = (id: string) => {
    // Custom widget sizing
    const customWidget = customWidgets.find(w => w.id === id);
    if (customWidget) {
      return customWidget.widgetType === 'chart' ? 'col-span-1 md:col-span-3 lg:col-span-3' : 'col-span-1 md:col-span-2 lg:col-span-2';
    }

    if (['total', 'weekly', 'duration'].includes(id)) {
      return 'col-span-1 md:col-span-2 lg:col-span-2'; 
    }
    if (['category', 'activity'].includes(id)) {
      return 'col-span-1 md:col-span-3 lg:col-span-3'; 
    }
    return 'col-span-1';
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Text className="text-gray-500">
            {enabledWidgets.length} widget{enabledWidgets.length !== 1 ? 's' : ''} enabled
          </Text>
        </div>
        <Button
          icon={<SettingOutlined />}
          onClick={() => setIsCustomizeOpen(true)}
        >
          Customize Dashboard
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 animate-in fade-in duration-500">
            {widgetOrder.map((id) => (
              <SortableItem key={id} id={id} className={getItemClass(id)}>
                {renderWidget(id)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <SettingOutlined />
            <span>Customize Dashboard</span>
          </div>
        }
        open={isCustomizeOpen}
        onCancel={() => setIsCustomizeOpen(false)}
        footer={[
          <Button key="create" onClick={() => setIsCreateWidgetOpen(true)}>
            + Create Custom Widget
          </Button>,
          <Button key="close" type="primary" onClick={() => setIsCustomizeOpen(false)}>
            Done
          </Button>,
        ]}
        width={600}
      >
        <div className="space-y-4">
          <Text type="secondary">
            Toggle widgets on/off to customize your dashboard. Drag widgets to reorder them.
          </Text>

          <div className="space-y-3 mt-4">
            {AVAILABLE_WIDGETS.map((widget) => {
              const isEnabled = enabledWidgets.includes(widget.id);
              const isLastEnabled = enabledWidgets.length === 1 && isEnabled;

              return (
                <div
                  key={widget.id}
                  className={`p-4 border rounded-lg transition-all ${
                    isEnabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-xl mt-1">{widget.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{widget.name}</div>
                        <div className="text-sm text-gray-500 mt-1">{widget.description}</div>
                        <div className="text-xs text-gray-400 mt-1 capitalize">
                          {widget.category}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onChange={() => toggleWidget(widget.id)}
                      disabled={isLastEnabled}
                      checkedChildren={<EyeOutlined />}
                      unCheckedChildren={<EyeInvisibleOutlined />}
                    />
                  </div>
                  {isLastEnabled && (
                    <Text type="secondary" className="text-xs block mt-2">
                      At least one widget must be enabled
                    </Text>
                  )}
                </div>
              );
            })}

            {customWidgets.length > 0 && (
              <>
                <div className="border-t pt-3 mt-4">
                  <Text strong>Custom Widgets</Text>
                </div>
                {customWidgets.map((widget) => {
                  const isEnabled = enabledWidgets.includes(widget.id);
                  return (
                    <div
                      key={widget.id}
                      className={`p-4 border rounded-lg transition-all ${
                        isEnabled ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{widget.name}</div>
                          <div className="text-xs text-gray-400 mt-1">Custom • {widget.query}</div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onChange={() => toggleWidget(widget.id)}
                          checkedChildren={<EyeOutlined />}
                          unCheckedChildren={<EyeInvisibleOutlined />}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        title="Create Custom Widget"
        open={isCreateWidgetOpen}
        onCancel={() => setIsCreateWidgetOpen(false)}
        onOk={handleCreateCustomWidget}
        okText="Create Widget"
      >
        <div className="space-y-4 py-4">
          <div>
            <Text strong>Widget Name</Text>
            <Input
              placeholder="e.g., Upcoming Events"
              value={newWidgetName}
              onChange={(e) => setNewWidgetName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Text strong>What would you like to see?</Text>
            <div className="flex gap-2 items-start mt-2">
              <Input.TextArea
                placeholder="e.g., Total events this month, Average meeting duration, Events by category"
                value={newWidgetQuery}
                onChange={(e) => setNewWidgetQuery(e.target.value)}
                rows={3}
                className="flex-1"
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <Button 
                onClick={handleTestQuery} 
                loading={isValidating}
                type="default"
                size="small"
              >
                Test Query
              </Button>
              {validationResult && (
                <Text type="success" className="text-xs">
                  {validationResult.type === 'metric' 
                    ? `Result: ${validationResult.value} ${validationResult.unit}`
                    : `Result: Chart (${validationResult.data?.length} items)`}
                </Text>
              )}
            </div>
          </div>

          <div>
            <Text strong>Icon</Text>
            <div className="flex gap-2 mt-2">
              {['CalendarOutlined', 'ClockCircleOutlined', 'RiseOutlined', 'PieChartOutlined', 'BarChartOutlined'].map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewWidgetIcon(icon)}
                  className={`p-3 border rounded-lg transition-all ${
                    newWidgetIcon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon === 'CalendarOutlined' && <CalendarOutlined className="text-xl" />}
                  {icon === 'ClockCircleOutlined' && <ClockCircleOutlined className="text-xl" />}
                  {icon === 'RiseOutlined' && <RiseOutlined className="text-xl" />}
                  {icon === 'PieChartOutlined' && <PieChartOutlined className="text-xl" />}
                  {icon === 'BarChartOutlined' && <BarChartOutlined className="text-xl" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Text strong>Color Theme</Text>
            <div className="flex gap-2 mt-2">
              {[
                { name: 'blue', class: 'bg-blue-500' },
                { name: 'green', class: 'bg-green-500' },
                { name: 'amber', class: 'bg-amber-500' },
                { name: 'red', class: 'bg-red-500' },
                { name: 'purple', class: 'bg-purple-500' },
                { name: 'pink', class: 'bg-pink-500' },
              ].map(color => (
                <button
                  key={color.name}
                  onClick={() => setNewWidgetColor(color.name)}
                  className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                    newWidgetColor === color.name ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AvailabilityAnalytics;
