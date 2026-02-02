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
  rto_policy?: string;
  current_round?: number;
  notes?: string;
  is_locked?: boolean;
  [key: string]: unknown;
}
