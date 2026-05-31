import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { Event } from '../../types';
import { getEvents, getApplications } from '../../api';
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
import { message } from 'antd';
import SegmentedToggle from '../../components/SegmentedToggle';
import PageActionToolbar from '../../components/PageActionToolbar';
import { parseDateOnlyLocal } from '../../utils/dateOnly';

import { MetricCardsSkeleton, SkeletonBlock } from '../../components/SkeletonLoader';

const JobHuntAnalytics = lazy(() => import('../../components/JobHuntAnalytics'));
const AvailabilityAnalytics = lazy(() => import('../../components/AvailabilityAnalytics'));
const WeeklyActivityChart = lazy(() => import('./WeeklyActivityChart'));

const SectionFallback = () => (
  <div className="w-full space-y-6 animate-in fade-in duration-300">
    <MetricCardsSkeleton count={3} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 enterprise-card p-6 min-h-[360px] flex flex-col justify-between">
        <SkeletonBlock width="150px" height="1.25rem" />
        <SkeletonBlock width="100%" height="240px" className="opacity-80" />
      </div>
      <div className="enterprise-card p-6 min-h-[360px] flex flex-col justify-between">
        <SkeletonBlock width="120px" height="1.25rem" />
        <div className="flex items-center justify-center h-full">
          <SkeletonBlock width="180px" height="180px" circle className="opacity-80" />
        </div>
      </div>
    </div>
  </div>
);

const Analytics: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<'availability' | 'career'>('availability');
  const [loading, setLoading] = useState(true);

  const [applications, setApplications] = useState<CareerApplication[]>([]);

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
    const stageCounts = {
      APPLIED: 0,
      OA: 0,
      SCREEN: 0,
      ONSITE: 0,
      OFFER: 0,
      REJECTED: 0,
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

    const funnelData = [
      { name: 'Applied', value: stageCounts.APPLIED, fill: '#2563eb' },
      { name: 'Online Assessment', value: stageCounts.OA, fill: '#60a5fa' },
      { name: 'Phone Screen', value: stageCounts.SCREEN, fill: '#ec4899' },
      { name: 'Onsite', value: stageCounts.ONSITE, fill: '#10b981' },
      { name: 'Offer', value: stageCounts.OFFER, fill: '#059669' },
    ].filter((item) => item.value > 0);

    const positiveResponses = stageCounts.SCREEN + stageCounts.ONSITE + stageCounts.OFFER;
    const totalApplications = data.length;
    const responseRate =
      totalApplications > 0 ? Math.round((positiveResponses / totalApplications) * 100) : 0;

    const weeks = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subWeeks(now, i);
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const end = endOfWeek(d, { weekStartsOn: 1 });

      const count = data.filter((app) => {
        if (!app.date_applied) return false; // If no date, skip
        const appDate = parseDateOnlyLocal(app.date_applied);
        if (!appDate) return false;
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
      offers: stageCounts.OFFER,
      funnelData,
      weeklyActivity: weeks,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        {contextHolder}
        <PageActionToolbar
          title="Analytics Dashboard"
          subtitle="Track availability patterns and job hunt performance."
          extraActions={<div className="w-[180px] h-[38px] shimmer-bg rounded-lg" />}
          singleRowDesktop
        />
        <SectionFallback />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {contextHolder}
      <PageActionToolbar
        title="Analytics Dashboard"
        subtitle="Track availability patterns and job hunt performance."
        extraActions={
          <SegmentedToggle
            value={activeTab}
            onChange={setActiveTab}
            wrapperClassName="grid grid-cols-2 sm:flex"
            options={[
              {
                value: 'availability',
                label: 'Availability',
                activeClassName: 'bg-white text-gray-900 shadow-sm',
              },
              {
                value: 'career',
                label: 'Job Hunt',
                activeClassName: 'bg-white text-blue-600 shadow-sm',
              },
            ]}
          />
        }
        singleRowDesktop
      />

      {activeTab === 'availability' && (
        <Suspense fallback={<SectionFallback />}>
          <AvailabilityAnalytics stats={availabilityStats} />
        </Suspense>
      )}

      {activeTab === 'career' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Suspense fallback={<SectionFallback />}>
            <JobHuntAnalytics applications={applications} />
          </Suspense>

          <Suspense fallback={<SectionFallback />}>
            <WeeklyActivityChart data={careerStats.weeklyActivity} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default Analytics;
