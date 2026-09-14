import type { ApplicationTimelineAnalytics } from '../../types';

export type JobHuntStats = {
  total: number;
  offers: number;
  ghosted: number;
  activeInterviews: number;
  totalInterviews: number;
  responseRate: string;
  respondedCount: number;
  offerRate: string;
  recentApplications30d: number;
  locations: { name: string; count: number }[];
  applicationAgeBreakdown: { name: string; count: number }[];
  timelineAnalytics?: ApplicationTimelineAnalytics | null;
  timelineAnalyticsLoading?: boolean;
  timelineAnalyticsError?: boolean;
};
