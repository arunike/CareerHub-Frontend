import { getApplications, getEvents } from '../api';
import type { Event } from '../types';
import type { CareerApplication } from '../types/application';
import { parseRecordDate } from './aiContextFormatting';
import type { AnalyticsContext, AnalyticsWidgetResult } from './browserAi';

export interface AnalyticsSourceData {
  applications: CareerApplication[];
  events: Event[];
}

export const getDateRangeFromQuery = (query: string) => {
  const now = new Date();

  if (query.includes('this month')) {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: null as Date | null,
    };
  }

  if (query.includes('last 30 days')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { start, end: null as Date | null };
  }

  if (query.includes('this week')) {
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return { start, end: null as Date | null };
  }

  const yearMatch = query.match(/\bin (\d{4})\b/);
  if (yearMatch?.[1]) {
    const year = Number(yearMatch[1]);
    return {
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    };
  }

  return { start: null as Date | null, end: null as Date | null };
};

export const isWithinDateRange = (
  value: string | undefined,
  start: Date | null,
  end: Date | null
) => {
  if (!start && !end) return true;
  const parsed = parseRecordDate(value);
  if (!parsed) return false;
  if (start && parsed < start) return false;
  if (end && parsed >= end) return false;
  return true;
};

export const computeEventDurationMinutes = (event: Event) => {
  const [startHour, startMinute] = event.start_time.split(':').map((part) => Number(part));
  const [endHour, endMinute] = event.end_time.split(':').map((part) => Number(part));
  if ([startHour, startMinute, endHour, endMinute].some((part) => Number.isNaN(part))) return 0;
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
};

export const buildAnalyticsSummary = ({ applications, events }: AnalyticsSourceData) => {
  const byStatus = Object.entries(
    applications.reduce<Record<string, number>>((acc, application) => {
      acc[application.status] = (acc[application.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count }));

  const byCategory = Object.entries(
    events.reduce<Record<string, number>>((acc, event) => {
      const category = event.category_details?.name || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {})
  ).map(([category, count]) => ({ category, count }));

  return {
    applications: {
      total: applications.length,
      by_status: byStatus,
      offers_count: applications.filter((application) =>
        ['OFFER', 'ACCEPTED'].includes(application.status)
      ).length,
      active_count: applications.filter(
        (application) => !['REJECTED', 'GHOSTED', 'ACCEPTED'].includes(application.status)
      ).length,
    },
    events: {
      total: events.length,
      by_category: byCategory,
      average_duration_minutes:
        events.length > 0
          ? Math.round(
              events.reduce((sum, event) => sum + computeEventDurationMinutes(event), 0) /
                events.length
            )
          : 0,
    },
  };
};

export const loadAnalyticsSourceData = async (): Promise<AnalyticsSourceData> => {
  const [applicationsResponse, eventsResponse] = await Promise.all([
    getApplications(),
    getEvents(),
  ]);
  return {
    applications: applicationsResponse.data as CareerApplication[],
    events: eventsResponse.data as Event[],
  };
};

export const normalizeAnalyticsContext = (
  queryLower: string,
  context: AnalyticsContext
): AnalyticsContext => {
  if (/(application|app|offer|interview)/.test(queryLower)) return 'job-hunt';
  if (/(event|meeting)/.test(queryLower)) return 'availability';
  return context;
};

export const processAnalyticsQueryDeterministically = (
  query: string,
  context: AnalyticsContext,
  sourceData: AnalyticsSourceData
): AnalyticsWidgetResult | null => {
  const queryLower = query.trim().toLowerCase();
  const normalizedContext = normalizeAnalyticsContext(queryLower, context);
  const { start, end } = getDateRangeFromQuery(queryLower);

  if (normalizedContext === 'availability') {
    const filteredEvents = sourceData.events.filter((event) =>
      isWithinDateRange(event.date, start, end)
    );

    if (/total (events|meetings)/.test(queryLower)) {
      return { type: 'metric', value: filteredEvents.length, unit: 'events' };
    }

    if (/average (duration|length)/.test(queryLower)) {
      const average =
        filteredEvents.length > 0
          ? Math.round(
              filteredEvents.reduce((sum, event) => sum + computeEventDurationMinutes(event), 0) /
                filteredEvents.length
            )
          : 0;
      return { type: 'metric', value: average, unit: 'minutes' };
    }

    if (/(events|meetings) by category/.test(queryLower)) {
      const data = Object.entries(
        filteredEvents.reduce<Record<string, number>>((acc, event) => {
          const category = event.category_details?.name || 'Uncategorized';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }));
      return { type: 'chart', data, chartType: 'pie' };
    }
  }

  if (normalizedContext === 'job-hunt') {
    const filteredApplications = sourceData.applications.filter((application) =>
      isWithinDateRange(application.date_applied || application.created_at, start, end)
    );

    if (/total (applications|apps)/.test(queryLower)) {
      return { type: 'metric', value: filteredApplications.length, unit: 'applications' };
    }

    if (/total (offers|offer)/.test(queryLower)) {
      const value = filteredApplications.filter((application) =>
        ['OFFER', 'ACCEPTED'].includes(application.status)
      ).length;
      return { type: 'metric', value, unit: 'offers' };
    }

    if (/active (applications|apps)/.test(queryLower)) {
      const value = filteredApplications.filter(
        (application) => !['REJECTED', 'GHOSTED', 'ACCEPTED'].includes(application.status)
      ).length;
      return { type: 'metric', value, unit: 'active apps' };
    }

    if (/(applications|apps) by status/.test(queryLower)) {
      const data = Object.entries(
        filteredApplications.reduce<Record<string, number>>((acc, application) => {
          acc[application.status] = (acc[application.status] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }));
      return { type: 'chart', data, chartType: 'bar' };
    }
  }

  return null;
};
