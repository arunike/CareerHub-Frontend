import { describe, expect, it } from 'vitest';
import {
  applicationsShortOfSample,
  bestVersion,
  comparableVersions,
  formatDelta,
  formatRate,
  rateDelta,
  sampleWarning,
} from './resumeVersions';
import type { ResumeVersionAnalyticsData, ResumeVersionStats } from './resumeVersions';

const version = (over: Partial<ResumeVersionStats> = {}): ResumeVersionStats => ({
  document_id: 1,
  root_id: 1,
  title: 'Backend Resume',
  version_number: 1,
  label: 'Backend Resume · v1',
  is_current: true,
  applications: 10,
  responded: 5,
  interviewed: 3,
  offers: 1,
  response_rate: 50,
  interview_rate: 30,
  offer_rate: 10,
  below_minimum_sample: false,
  first_used: '2026-07-01',
  last_used: '2026-10-01',
  by_role_type: [],
  by_source: [],
  ...over,
});

const data = (versions: ResumeVersionStats[]): ResumeVersionAnalyticsData => ({
  minimum_sample_size: 5,
  versions,
  total_applications: versions.reduce((sum, row) => sum + row.applications, 0),
  tracked_applications: versions.reduce((sum, row) => sum + row.applications, 0),
  untracked_applications: 0,
  overall: {
    applications: 20,
    responded: 8,
    interviewed: 4,
    offers: 1,
    response_rate: 40,
    interview_rate: 20,
    offer_rate: 5,
    below_minimum_sample: false,
  },
});

describe('comparableVersions', () => {
  it('drops the versions the backend already flagged as too thin', () => {
    const thin = version({ document_id: 2, below_minimum_sample: true });
    expect(comparableVersions(data([version(), thin])).map((row) => row.document_id)).toEqual([1]);
  });
});

describe('bestVersion', () => {
  it('names the version that gets you into the room most often', () => {
    const weak = version({ document_id: 2, label: 'v2', interview_rate: 12 });
    expect(bestVersion(data([version(), weak]))?.document_id).toBe(1);
  });

  it('declares nothing when only one version has enough applications', () => {
    const thin = version({ document_id: 2, interview_rate: 90, below_minimum_sample: true });
    expect(bestVersion(data([version(), thin]))).toBeNull();
  });

  it('declares nothing on a tie, because a tie is not a finding', () => {
    const twin = version({ document_id: 2, label: 'v2' });
    expect(bestVersion(data([version(), twin]))).toBeNull();
  });

  it('needs something to compare against', () => {
    expect(bestVersion(data([version()]))).toBeNull();
    expect(bestVersion(data([]))).toBeNull();
  });

  it('ranks on interviews rather than offers, which swing on a single yes', () => {
    const luckyOffer = version({
      document_id: 2,
      label: 'v2',
      interview_rate: 10,
      offer_rate: 100,
    });
    expect(bestVersion(data([version(), luckyOffer]))?.document_id).toBe(1);
  });
});

describe('rateDelta', () => {
  it('measures the version against the account average', () => {
    expect(rateDelta(version(), data([version()]), 'response_rate')).toBe(10);
    expect(rateDelta(version({ interview_rate: 8 }), data([version()]), 'interview_rate')).toBe(
      -12
    );
  });

  it('does not leak floating point noise into the display', () => {
    const noisy = version({ response_rate: 40.1 });
    expect(rateDelta(noisy, data([noisy]), 'response_rate')).toBe(0.1);
  });
});

describe('sampleWarning', () => {
  it('says how many more applications it would take', () => {
    expect(sampleWarning(version({ applications: 3 }), 5)).toBe(
      '2 more applications before these rates mean much'
    );
    expect(sampleWarning(version({ applications: 4 }), 5)).toBe(
      '1 more application before these rates mean much'
    );
  });

  it('goes quiet once the sample is big enough', () => {
    expect(sampleWarning(version({ applications: 5 }), 5)).toBeNull();
    expect(sampleWarning(version({ applications: 40 }), 5)).toBeNull();
  });

  it('never reports a negative shortfall', () => {
    expect(applicationsShortOfSample(version({ applications: 9 }), 5)).toBe(0);
  });
});

describe('formatting', () => {
  it('keeps one decimal so 33.3% and 33% are not shown as the same thing', () => {
    expect(formatRate(33.33)).toBe('33.3%');
    expect(formatRate(0)).toBe('0.0%');
  });

  it('signs a delta and words a zero rather than printing +0.0', () => {
    expect(formatDelta(4.2)).toBe('+4.2 pts vs average');
    expect(formatDelta(-4.2)).toBe('-4.2 pts vs average');
    expect(formatDelta(0)).toBe('same as average');
  });
});
