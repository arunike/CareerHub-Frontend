import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ApplicationStats, Event } from '../../types';
import { getEvents } from '../../api';
import { getApplicationStats } from '../../api/career';
import { buildEventStats, eventYears, scopeEventsToYear } from './eventLoad';
import { message } from 'antd';
import SegmentedToggle from '../../components/SegmentedToggle';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState } from '../../components/PageState';

import { MetricCardsSkeleton, SkeletonBlock } from '../../components/SkeletonLoader';

const JobHuntAnalytics = lazy(() => import('../../components/JobHuntAnalytics'));
const AvailabilityAnalytics = lazy(() => import('../../components/AvailabilityAnalytics'));
const ActivityChart = lazy(() => import('./ActivityChart'));

const SectionFallback = () => (
  <div className="w-full space-y-6">
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
  const [searchParams, setSearchParams] = useSearchParams();
  // Driven by the URL rather than local state: a refresh, a back button, or a shared link
  // all land on the tab you were actually looking at.
  const activeTab: 'availability' | 'career' =
    searchParams.get('tab') === 'career' ? 'career' : 'availability';
  const setActiveTab = (next: 'availability' | 'career') => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    // replace, so switching tabs does not stack history entries to click back through.
    setSearchParams(params, { replace: true });
  };
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState(false);

  const [applicationStats, setApplicationStats] = useState<ApplicationStats | null>(null);
  // Kept out of applicationStats so the picker keeps every year while a year is selected.
  const [applicationYears, setApplicationYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());

  const [events, setEvents] = useState<Event[]>([]);

  const fetchAvailabilityAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setAvailabilityError(false);
      const eventsResp = await getEvents();
      setEvents(eventsResp.data);
    } catch (error) {
      setAvailabilityError(true);
      messageApi.error('Error fetching analytics');
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  // Both tabs answer to the same year control now. Events were mixing 2024, 2025 and 2026
  // into one "Total Events", which no amount of reading the number could reveal.
  const eventYearOptions = useMemo(() => eventYears(events), [events]);
  const scopedEvents = useMemo(
    () => scopeEventsToYear(events, selectedYear),
    [events, selectedYear]
  );
  const availabilityStats = useMemo(
    () => buildEventStats(scopedEvents, new Date()),
    [scopedEvents]
  );

  // Counts come pre-aggregated, so the year filter is a 3 KB refetch rather than a
  // client-side filter over every application the page had to download first.
  const fetchCareerAnalytics = useCallback(async () => {
    try {
      setCareerLoading(true);
      setCareerError(false);
      const { data } = await getApplicationStats(selectedYear);
      setApplicationStats(data);
      setApplicationYears(data.years);
    } catch (error) {
      setCareerError(true);
      messageApi.error('Error fetching job hunt analytics');
      console.error('Error fetching job hunt analytics:', error);
    } finally {
      setCareerLoading(false);
    }
  }, [selectedYear, messageApi]);

  useEffect(() => {
    fetchAvailabilityAnalytics();
  }, [fetchAvailabilityAnalytics]);

  useEffect(() => {
    if (activeTab === 'career') {
      void fetchCareerAnalytics();
    }
  }, [activeTab, fetchCareerAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6 w-full">
        {contextHolder}
        <PageActionToolbar
          title="Analytics"
          subtitle="Review availability patterns and job search progress."
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
        title="Analytics"
        subtitle="Review availability patterns and job search progress."
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={activeTab === 'career' ? applicationYears : eventYearOptions}
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
                label: 'Job Search',
                activeClassName: 'bg-white text-blue-600 shadow-sm',
              },
            ]}
          />
        }
        singleRowDesktop
      />

      {activeTab === 'availability' && availabilityError ? (
        <PageState
          tone="error"
          title="Availability analytics could not be loaded"
          description="Your events were not changed. Check your connection and try loading the analysis again."
          actionLabel="Retry availability analytics"
          onAction={() => void fetchAvailabilityAnalytics()}
        />
      ) : activeTab === 'availability' ? (
        <div className="space-y-6">
          <Suspense fallback={<SectionFallback />}>
            <AvailabilityAnalytics stats={availabilityStats} />
          </Suspense>

          <Suspense fallback={<SectionFallback />}>
            <ActivityChart
              key={`events-${selectedYear}`}
              dailyApplied={availabilityStats.dailyCounts}
              selectedYear={selectedYear}
              noun={{ one: 'event', many: 'events' }}
              title="Event Activity"
            />
          </Suspense>
        </div>
      ) : null}

      {activeTab === 'career' && (
        <div className="space-y-6">
          {careerError ? (
            <PageState
              tone="error"
              title="Job search analytics could not be loaded"
              description="Your applications were not changed. Check your connection and try loading the analysis again."
              actionLabel="Retry job search analytics"
              onAction={() => void fetchCareerAnalytics()}
            />
          ) : careerLoading && !applicationStats ? (
            <SectionFallback />
          ) : (
            <>
              <Suspense fallback={<SectionFallback />}>
                <JobHuntAnalytics applicationStats={applicationStats} selectedYear={selectedYear} />
              </Suspense>

              <Suspense fallback={<SectionFallback />}>
                <ActivityChart
                  key={selectedYear}
                  dailyApplied={applicationStats?.daily_applied ?? {}}
                  selectedYear={selectedYear}
                />
              </Suspense>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
