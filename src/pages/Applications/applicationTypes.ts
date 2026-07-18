import type { Dayjs } from 'dayjs';
import type { CareerApplication } from '../../types/application';
import {
  DEFAULT_APPLICATION_STAGES,
  type ApplicationStage,
} from '../../constants/applicationStages';

export { DEFAULT_APPLICATION_STAGES, type ApplicationStage };

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

export const DEFAULT_APPLICATION_SUMMARY: ApplicationSummary = {
  total: 0,
  interviews: 0,
  offers: 0,
  locked: 0,
};

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
    (app) =>
      app.status === 'SCREEN' ||
      app.status === 'FINAL_ROUND' ||
      app.status === 'ONSITE' ||
      app.status.startsWith('ROUND_')
  ).length,
  offers: applications.filter((app) => app.status === 'OFFER').length,
  locked: applications.filter((app) => app.is_locked).length,
});
