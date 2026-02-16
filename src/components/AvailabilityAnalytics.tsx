import React, { useState, useEffect } from 'react';
import {
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  PieChartOutlined,
  HolderOutlined
} from '@ant-design/icons';
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

const COLORS = ['#1890ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

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

const SortableItem = ({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

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
  const [items, setItems] = useState<string[]>(['total', 'weekly', 'duration', 'category', 'activity']);

  useEffect(() => {
    const saved = localStorage.getItem('availability_analytics_order');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse availability analytics order', e);
      }
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over!.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('availability_analytics_order', JSON.stringify(newItems));
        return newItems;
      });
    }
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case 'total':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CalendarOutlined className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalEvents}
                </p>
              </div>
            </div>
          </div>
        );
      case 'weekly':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <RiseOutlined className="w-6 h-6 text-green-600" />
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
              <div className="p-3 bg-amber-100 rounded-lg">
                <ClockCircleOutlined className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgDuration} min
                </p>
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
              <div className="h-[300px] w-full">
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
                        label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Activity (Last 7 Days)
                </h3>
              </div>
              <div className="h-[300px] w-full">
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
      default:
        return null;
    }
  };


  
  // Custom grid logic based on item type is tricky with general grid. 
  // Let's try to match the previous layout: 
  // Top row: 3 cards (grid-cols-3)
  // Bottom row: 2 charts (grid-cols-2)
  // With DND, it's a single grid.
  // if we make it grid-cols-1 md:grid-cols-2 lg:grid-cols-6?
  // Cards = col-span-2 (3 cards = 6 cols)
  // Charts = col-span-3 (2 charts = 6 cols)

  const getItemClass = (id: string) => {
      if (['total', 'weekly', 'duration'].includes(id)) {
          return 'col-span-1 md:col-span-2 lg:col-span-2'; // 1/3 of row on lg (assuming 6 col grid)
      }
      if (['category', 'activity'].includes(id)) {
          return 'col-span-1 md:col-span-3 lg:col-span-3'; // 1/2 of row on lg
      }
      return 'col-span-1';
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={items} 
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 animate-in fade-in duration-500">
          {items.map((id) => (
            <SortableItem key={id} id={id} className={getItemClass(id)}>
              {renderWidget(id)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default AvailabilityAnalytics;
