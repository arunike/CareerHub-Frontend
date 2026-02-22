import React, { useMemo, useState, useEffect } from 'react';
import {
  EnvironmentOutlined,
  AimOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
  NumberOutlined,
  HolderOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Modal, Button, Switch, Typography, Input, message, Tag } from 'antd';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
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
  type DragOverEvent,
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

import type { CareerApplication } from '../types/application';

const { Text } = Typography;

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
    name: 'Total Applications',
    description: 'Total number of applications submitted',
    icon: <FileTextOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'active',
    name: 'Active Applications',
    description: 'Applications currently in progress',
    icon: <ClockCircleOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'outcomes',
    name: 'Outcomes Summary',
    description: 'Breakdown of application outcomes',
    icon: <TrophyOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'ghosted',
    name: 'Ghosted Rate',
    description: 'Percentage of applications ghosted',
    icon: <QuestionCircleOutlined />,
    defaultEnabled: true,
    category: 'statistic',
  },
  {
    id: 'locations',
    name: 'Top Locations',
    description: 'Most common application locations',
    icon: <EnvironmentOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
  {
    id: 'rounds',
    name: 'Interview Rounds',
    description: 'Distribution of interview rounds',
    icon: <NumberOutlined />,
    defaultEnabled: true,
    category: 'chart',
  },
];

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

    setNewWidgetColor('blue');
    setIsCreateWidgetOpen(false);

    messageApi.success('Custom widget created!');
  };

  const stats = useMemo(() => {
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
    };
  }, [applications]);

  const renderWidget = (id: string) => {
    switch (id) {
      case 'total':
        return (
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Applications</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <FileTextOutlined className="mr-1.5 text-base" />
              <span>Tracked</span>
            </div>
          </div>
        );
      case 'active':
        return (
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Active Interviews</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900">{stats.activeInterviews}</p>
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {stats.interviewRate}% Rate
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <ClockCircleOutlined className="mr-1.5 text-blue-500 text-base" />
              <span>In Pipeline</span>
            </div>
          </div>
        );
      case 'outcomes':
        return (
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Outcomes</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.offers}</p>
                  <p className="text-xs text-gray-500">Offers</p>
                </div>
                <div className="w-px bg-gray-200 h-10"></div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{stats.rejections}</p>
                  <p className="text-xs text-gray-500">Rejections</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-400">
              <CheckCircleOutlined className="mr-1.5 text-green-500 text-base" />
              <span>vs</span>
              <CloseCircleOutlined className="ml-1.5 text-red-500 text-base" />
            </div>
          </div>
        );
      case 'ghosted':
        return (
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">No Response</p>
              <p className="text-3xl font-bold text-gray-700">{stats.ghosted}</p>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <QuestionCircleOutlined className="mr-1.5 text-gray-400 text-base" />
              <span>Ghosted</span>
            </div>
          </div>
        );
      case 'locations':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <EnvironmentOutlined className="text-xl text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Top Locations</h3>
              </div>
            </div>
            <div className="space-y-4">
              {stats.locations.slice(0, 8).map((loc, idx) => (
                <div key={loc.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        idx === 0
                          ? 'bg-blue-100 text-blue-700'
                          : idx === 1
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 font-medium">{loc.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(loc.count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-mono text-gray-900 font-bold">{loc.count}</span>
                  </div>
                </div>
              ))}
              {stats.locations.length === 0 && (
                <div className="text-center py-8 text-gray-400">No location data found</div>
              )}
            </div>
          </div>
        );
      case 'rounds':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AimOutlined className="text-xl text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Interview Rounds</h3>
              </div>
            </div>
            <div className="h-75 w-full">
              {stats.rounds.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.rounds}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar dataKey="count" name="Applications" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      {stats.rounds.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#1890ff', '#8b5cf6', '#ec4899', '#f43f5e'][index % 4]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <NumberOutlined className="text-3xl mb-2 opacity-50" />
                  <p>No interview rounds logged yet</p>
                  <p className="text-xs mt-1">Add "Current Round" to applications to see stats</p>
                </div>
              )}
            </div>
          </div>
        );
      default: {
        const customWidget = customWidgets.find(w => w.id === id);
        if (customWidget) {
          return <CustomWidgetCard widget={customWidget} onDelete={deleteCustomWidget} />;
        }
        return null;
      }
    }
  };

  const getColSpan = (id: string) => {
    // Check custom widgets
    const customWidget = customWidgets.find(w => w.id === id);
    if (customWidget) {
      return customWidget.widgetType === 'chart' ? 'col-span-1 md:col-span-2 lg:col-span-2' : 'col-span-1';
    }

    // Charts take 2 columns on large screens, Stats take 1
    if (['locations', 'rounds'].includes(id)) {
      return 'col-span-1 md:col-span-2 lg:col-span-2';
    }
    return 'col-span-1';
  };

  return (
    <>
      {contextHolder}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Text className="text-gray-500">
            {enabledWidgets.length} widget{enabledWidgets.length !== 1 ? 's' : ''} enabled
          </Text>
        </div>
        <button
          onClick={() => setIsCustomizeOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
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
              <SortableItem key={id} id={id} className={getColSpan(id)}>
                {renderWidget(id)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div 
              className={`h-full ${getColSpan(activeId)}`}
              style={activeSize ? { width: activeSize.width, height: activeSize.height } : undefined}
            >
              {renderWidget(activeId)}
            </div>
          ) : null}
        </DragOverlay>
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
              placeholder="e.g., Pending Applications"
              value={newWidgetName}
              onChange={(e) => setNewWidgetName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Text strong>What would you like to see?</Text>
            <div className="flex gap-2 items-start mt-2">
              <Input.TextArea
                placeholder="e.g., Total applications, Active applications, Applications by status"
                value={newWidgetQuery}
                onChange={(e) => setNewWidgetQuery(e.target.value)}
                rows={3}
                className="flex-1"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Text type="secondary" className="text-xs">Try charts:</Text>
              <Tag
                className="cursor-pointer hover:border-blue-500"
                onClick={() => {
                  setNewWidgetQuery('Applications by status');
                  setNewWidgetIcon('BarChartOutlined');
                }}
              >
                Applications by status
              </Tag>
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
              {['FileTextOutlined', 'ClockCircleOutlined', 'TrophyOutlined', 'EnvironmentOutlined', 'NumberOutlined'].map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewWidgetIcon(icon)}
                  className={`p-3 border rounded-lg transition-all ${
                    newWidgetIcon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon === 'FileTextOutlined' && <FileTextOutlined className="text-xl" />}
                  {icon === 'ClockCircleOutlined' && <ClockCircleOutlined className="text-xl" />}
                  {icon === 'TrophyOutlined' && <TrophyOutlined className="text-xl" />}
                  {icon === 'EnvironmentOutlined' && <EnvironmentOutlined className="text-xl" />}
                  {icon === 'NumberOutlined' && <NumberOutlined className="text-xl" />}
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

export default JobHuntAnalytics;
