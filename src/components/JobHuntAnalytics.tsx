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
  HolderOutlined
} from '@ant-design/icons';
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

import type { CareerApplication } from '../types/application';

interface AnalyticsProps {
  applications: CareerApplication[];
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
  const [items, setItems] = useState<string[]>(['total', 'active', 'outcomes', 'ghosted', 'locations', 'rounds']);

  useEffect(() => {
    const saved = localStorage.getItem('analytics_dashboard_order');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse analytics order', e);
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
        localStorage.setItem('analytics_dashboard_order', JSON.stringify(newItems));
        return newItems;
      });
    }
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
              <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
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
                          ? 'bg-indigo-100 text-indigo-700'
                          : idx === 1
                            ? 'bg-indigo-50 text-indigo-600'
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
                        className="h-full bg-indigo-500 rounded-full"
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
            <div className="h-[300px] w-full">
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
                          fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'][index % 4]}
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
      default:
        return null;
    }
  };

  const getColSpan = (id: string) => {
    // Charts take 2 columns on large screens, Stats take 1
    if (['locations', 'rounds'].includes(id)) {
      return 'col-span-1 md:col-span-2 lg:col-span-2';
    }
    return 'col-span-1';
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((id) => (
            <SortableItem key={id} id={id} className={getColSpan(id)}>
              {renderWidget(id)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default JobHuntAnalytics;
