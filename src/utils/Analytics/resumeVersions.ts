import type { ResumeVersionAnalyticsData, ResumeVersionStats } from '../../types/career';

export type {
  ResumeGroupStats,
  ResumeVersionAnalyticsData,
  ResumeVersionStats,
} from '../../types/career';

export type RateKey = 'response_rate' | 'interview_rate' | 'offer_rate';

export const RATE_LABELS: Record<RateKey, string> = {
  response_rate: 'Response',
  interview_rate: 'Interview',
  offer_rate: 'Offer',
};

// Only versions with enough behind them can be compared; the rest are anecdotes with a percentage.
export const comparableVersions = (data: ResumeVersionAnalyticsData) =>
  data.versions.filter((version) => !version.below_minimum_sample);

// Ranked on interviews, not offers: an offer rate swings on a single yes.
export const bestVersion = (data: ResumeVersionAnalyticsData): ResumeVersionStats | null => {
  const eligible = comparableVersions(data);
  if (eligible.length < 2) return null;
  const ranked = [...eligible].sort(
    (a, b) => b.interview_rate - a.interview_rate || b.applications - a.applications
  );
  // A tie is not a finding, so nothing is declared best.
  return ranked[0].interview_rate > ranked[1].interview_rate ? ranked[0] : null;
};

export const rateDelta = (
  version: ResumeVersionStats,
  data: ResumeVersionAnalyticsData,
  rate: RateKey
) => Math.round((version[rate] - data.overall[rate]) * 10) / 10;

// How many more applications this version needs before its rates mean anything.
export const applicationsShortOfSample = (version: ResumeVersionStats, minimumSampleSize: number) =>
  Math.max(0, minimumSampleSize - version.applications);

export const sampleWarning = (version: ResumeVersionStats, minimumSampleSize: number) => {
  const short = applicationsShortOfSample(version, minimumSampleSize);
  if (short === 0) return null;
  return short === 1
    ? '1 more application before these rates mean much'
    : `${short} more applications before these rates mean much`;
};

export const formatRate = (value: number) => `${value.toFixed(1)}%`;

export const formatDelta = (value: number) =>
  value === 0 ? 'same as average' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pts vs average`;
