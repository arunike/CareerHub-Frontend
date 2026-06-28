import type { Dayjs } from 'dayjs';
import type { CareerApplication } from '../../types/application';

export const APPLICATION_PAGE_SIZE = 10;

export type ApplicationOrdering = 'status' | '-status' | undefined;

export interface ApplicationSummary {
  total: number;
  interviews: number;
  offers: number;
  locked: number;
}

export interface PaginatedApplicationsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CareerApplication[];
  summary?: ApplicationSummary;
}

export const isPaginatedApplicationsResponse = (
  data: CareerApplication[] | PaginatedApplicationsResponse
): data is PaginatedApplicationsResponse =>
  Boolean(data && !Array.isArray(data) && Array.isArray(data.results));

export type ApplicationFormValues = {
  company?: string;
  role_title?: string;
  status?: string;
  employment_type?: string;
  site_link?: string;
  salary_range?: string;
  office_location?: string;
  visa_sponsorship?: string;
  day_one_gc?: string;
  growth_score?: number;
  work_life_score?: number;
  brand_score?: number;
  team_score?: number;
  current_round?: number;
  date_applied?: Dayjs | null;
  notes?: string;
  linked_document_ids?: number[];
};

export type ApplicationStage = {
  key: string;
  label: string;
  shortLabel: string;
  tone: string;
};

export const DEFAULT_APPLICATION_SUMMARY: ApplicationSummary = {
  total: 0,
  interviews: 0,
  offers: 0,
  locked: 0,
};

export const DEFAULT_APPLICATION_STAGES: ApplicationStage[] = [
  { key: 'APPLIED', label: 'Applied', shortLabel: 'Apply', tone: 'bg-blue-500' },
  { key: 'OA', label: 'Online Assessment', shortLabel: 'OA', tone: 'bg-blue-500' },
  { key: 'SCREEN', label: 'Phone Screen', shortLabel: 'Phone', tone: 'bg-sky-500' },
  { key: 'ROUND_1', label: '1st Round', shortLabel: 'R1', tone: 'bg-amber-400' },
  { key: 'ROUND_2', label: '2nd Round', shortLabel: 'R2', tone: 'bg-amber-500' },
  { key: 'ROUND_3', label: '3rd Round', shortLabel: 'R3', tone: 'bg-orange-500' },
  { key: 'ROUND_4', label: '4th Round', shortLabel: 'R4', tone: 'bg-orange-600' },
  { key: 'ONSITE', label: 'Onsite Interview', shortLabel: 'Onsite', tone: 'bg-red-500' },
  { key: 'OFFER', label: 'Offer', shortLabel: 'Offer', tone: 'bg-emerald-500' },
  { key: 'REJECTED', label: 'Rejected', shortLabel: 'Reject', tone: 'bg-rose-500' },
  { key: 'GHOSTED', label: 'Ghosted', shortLabel: 'Ghost', tone: 'bg-slate-400' },
  {
    key: 'REMOVED_FROM_SHEET',
    label: 'Removed from Sheet',
    shortLabel: 'Removed',
    tone: 'bg-slate-500',
  },
];

export const getRoundNumberFromStatus = (status?: string) => {
  const match = status?.match(/^ROUND_(\d+)$/);
  return match ? Number(match[1]) : 0;
};

export const summarizeApplications = (
  applications: CareerApplication[],
  total = applications.length
): ApplicationSummary => ({
  total,
  interviews: applications.filter(
    (app) => app.status === 'SCREEN' || app.status === 'ONSITE' || app.status.startsWith('ROUND_')
  ).length,
  offers: applications.filter((app) => app.status === 'OFFER').length,
  locked: applications.filter((app) => app.is_locked).length,
});
