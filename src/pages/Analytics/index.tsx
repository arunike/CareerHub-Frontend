import React, { useState, useEffect } from 'react';
import type { Event } from '../../types';
import { getEvents, getApplications } from '../../api';
import { RiseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addDays,
  subWeeks,
} from 'date-fns';
import type { CareerApplication } from '../../types/application';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import JobHuntAnalytics from '../../components/JobHuntAnalytics';
import AvailabilityAnalytics from '../../components/AvailabilityAnalytics';
import { message } from 'antd';

const Analytics: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<'availability' | 'career'>('availability');
  const [loading, setLoading] = useState(true);

  // Data States
  const [applications, setApplications] = useState<CareerApplication[]>([]);

  // Derived Stats
  const [availabilityStats, setAvailabilityStats] = useState({
    totalEvents: 0,
    thisWeek: 0,
    avgDuration: 0,
    byCategory: [] as { name: string; value: number }[],
    dailyActivity: [] as { date: string; count: number; minutes: number }[],
  });

  const [careerStats, setCareerStats] = useState({
    totalApplications: 0,
    responseRate: 0,
    activeProcesses: 0,
    offers: 0,
    funnelData: [] as { name: string; value: number; fill: string }[],
    weeklyActivity: [] as { date: string; count: number }[],
  });

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [eventsResp, appsResp] = await Promise.all([getEvents(), getApplications()]);

      const eventsData = eventsResp.data;
      const appsData = appsResp.data;

      setApplications(appsData);

      processAvailabilityData(eventsData);
      processCareerData(appsData);
      processCareerData(appsData);
    } catch (error) {
      messageApi.error('Error fetching analytics');
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAvailabilityData = (data: Event[]) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // 1. Basic Stats
    const thisWeekEvents = data.filter((e) => {
      const eventDate = parseISO(e.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    let totalMinutes = 0;
    data.forEach((e) => {
      const start = new Date(`2000-01-01T${e.start_time}`);
      const end = new Date(`2000-01-01T${e.end_time}`);
      totalMinutes += (end.getTime() - start.getTime()) / 60000;
    });

    // 2. Category Data for Pie Chart
    const categoryCount: Record<string, number> = {};
    data.forEach((e) => {
      const catName = e.category_details?.name || 'Uncategorized';
      categoryCount[catName] = (categoryCount[catName] || 0) + 1;
    });

    const pieData = Object.entries(categoryCount)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    // 3. Daily Activity for Bar Chart (Last 7 Days)
    const last7Days = eachDayOfInterval({
      start: addDays(now, -6),
      end: now,
    });

    const activityData = last7Days.map((day) => {
      const dayEvents = data.filter((e) => isSameDay(parseISO(e.date), day));
      let mins = 0;
      dayEvents.forEach((e) => {
        const s = new Date(`2000-01-01T${e.start_time}`);
        const en = new Date(`2000-01-01T${e.end_time}`);
        mins += (en.getTime() - s.getTime()) / 60000;
      });

      return {
        date: format(day, 'MMM dd'),
        count: dayEvents.length,
        minutes: mins,
      };
    });

    setAvailabilityStats({
      totalEvents: data.length,
      thisWeek: thisWeekEvents.length,
      avgDuration: data.length > 0 ? Math.round(totalMinutes / data.length) : 0,
      byCategory: pieData,
      dailyActivity: activityData,
    });
  };

  const processCareerData = (
    data: Array<{ status: string; date_applied?: string; [key: string]: unknown }>
  ) => {
    // 1. Funnel Data
    const stageCounts = {
      APPLIED: 0,
      OA: 0,
      SCREEN: 0,
      ONSITE: 0,
      OFFER: 0,
      REJECTED: 0,
      ACCEPTED: 0,
    };

    let activeCount = 0;

    data.forEach((app) => {
      const status = app.status;
      if (Object.prototype.hasOwnProperty.call(stageCounts, status)) {
        // @ts-expect-error - dynamic key access
        stageCounts[status]++;
      }

      if (['APPLIED', 'OA', 'SCREEN', 'ONSITE'].includes(status)) {
        activeCount++;
      }
    });

    // Construct Funnel (Simplified Pipeline View)
    const funnelData = [
      { name: 'Applied', value: stageCounts.APPLIED, fill: '#1890ff' },
      { name: 'Online Assessment', value: stageCounts.OA, fill: '#8b5cf6' },
      { name: 'Phone Screen', value: stageCounts.SCREEN, fill: '#ec4899' },
      { name: 'Onsite', value: stageCounts.ONSITE, fill: '#10b981' },
      { name: 'Offer', value: stageCounts.OFFER + stageCounts.ACCEPTED, fill: '#059669' },
    ].filter((item) => item.value > 0);

    // 2. Response Rate Calculation
    const positiveResponses =
      stageCounts.SCREEN + stageCounts.ONSITE + stageCounts.OFFER + stageCounts.ACCEPTED;
    const totalApplications = data.length;
    const responseRate =
      totalApplications > 0 ? Math.round((positiveResponses / totalApplications) * 100) : 0;

    // 3. Weekly Activity (Last 12 Weeks)
    const weeks = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subWeeks(now, i);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const end = endOfWeek(d, { weekStartsOn: 1 });

      const count = data.filter((app) => {
        if (!app.date_applied) return false; // If no date, skip
        const appDate = new Date(app.date_applied); // Assuming date_applied is YYYY-MM-DD
        return appDate >= start && appDate <= end;
      }).length;

      weeks.push({
        date: format(start, 'MMM dd'),
        count,
      });
    }

    setCareerStats({
      totalApplications,
      responseRate,
      activeProcesses: activeCount,
      offers: stageCounts.OFFER + stageCounts.ACCEPTED,
      funnelData,
      weeklyActivity: weeks,
    });
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 w-full">
      {contextHolder}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ThunderboltOutlined className="text-2xl text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'availability'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Availability
          </button>
          <button
            onClick={() => setActiveTab('career')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'career'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Job Hunt
          </button>
        </div>
      </div>

      {activeTab === 'availability' ? (
        <AvailabilityAnalytics stats={availabilityStats} />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <JobHuntAnalytics applications={applications} />

          {/* Weekly Volume Chart - Kept as supplementary info */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <RiseOutlined className="text-xl text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Weekly Activity (Last 12 Weeks)
              </h3>
            </div>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={careerStats.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="count" name="Applications" fill="#1890ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
