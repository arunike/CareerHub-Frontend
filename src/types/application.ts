import type { DayOneGcStatus, VisaSponsorshipStatus } from '../pages/OfferComparison/calculations';

export interface CareerApplication {
  id: number;
  company_details?: { name: string };
  role_title: string;
  status: string;
  date_applied?: string;
  created_at: string;
  updated_at: string;
  job_link?: string;
  salary_range?: string;
  location?: string;
  office_location?: string;
  rto_policy?: string;
  rto_days_per_week?: number;
  visa_sponsorship?: VisaSponsorshipStatus;
  day_one_gc?: DayOneGcStatus;
  growth_score?: number | null;
  work_life_score?: number | null;
  brand_score?: number | null;
  team_score?: number | null;
  current_round?: number;
  employment_type?: string | null;
  notes?: string;
  is_locked?: boolean;
  source_removed_at?: string | null;
  source_removed_delete_after?: string | null;
  [key: string]: unknown;
}
