import type { TeamEntry } from './calendar';

export interface Document {
  id: number;
  title: string;
  file: string | null;
  file_name?: string | null;
  document_type: 'RESUME' | 'COVER_LETTER' | 'OFFER_LETTER' | 'PORTFOLIO' | 'OTHER';
  application?: number | null;
  root_document?: number | null;
  root_document_id?: number;
  version_number?: number;
  version_count?: number;
  is_current?: boolean;
  is_locked?: boolean;
  application_details?: {
    id: number;
    company: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export type ApplicationTimelineStage = string;

export interface ApplicationTimelineEntry {
  id: number;
  application: number;
  stage: ApplicationTimelineStage;
  stage_label: string;
  stage_order: number;
  display_title: string;
  event_date?: string | null;
  notes: string;
  documents: number[];
  document_details?: Array<{
    id: number;
    title: string;
    document_type: Document['document_type'];
    file_name?: string | null;
    application?: number | null;
  }>;
  created_at: string;
  updated_at: string;
}

export interface InterviewDebrief {
  id: number;
  application: number;
  stage: string;
  interview_date?: string | null;
  questions_asked?: string;
  went_well?: string;
  weak_areas?: string;
  interviewer_notes?: string;
  confidence?: number | null;
  next_steps?: string;
  created_at?: string;
  updated_at?: string;
}

export type ContactRelationshipKind =
  | 'CONTACT'
  | 'RECRUITER'
  | 'INTERVIEWER'
  | 'HIRING_MANAGER'
  | 'MANAGER'
  | 'DIRECT_TEAMMATE'
  | 'COWORKER'
  | 'TECH_LEAD'
  | 'MENTOR'
  | 'WORKS_WITH'
  | 'CUSTOM';

export interface ContactContext {
  id: number;
  career_record: number;
  application: number | null;
  experience: number | null;
  source: 'APPLICATION' | 'EXPERIENCE' | 'MANUAL';
  notes?: string;
  summary: {
    type: 'APPLICATION' | 'EXPERIENCE';
    company: string;
    role: string;
    status: string;
  };
  created_at: string;
}

export interface ApplicationContact {
  id: number;
  application: number | null;
  experience: number | null;
  inherited?: boolean;
  possible_duplicate?: boolean;
  name: string;
  email?: string;
  job_title?: string;
  company?: string;
  notes?: string;
  is_locked?: boolean;
  contexts?: ContactContext[];
  created_at?: string;
  updated_at?: string;
}

export interface ContactRelationship {
  id: number;
  source_contact: number | null;
  source_name: string;
  target_contact: number;
  target_name: string;
  kind: ContactRelationshipKind;
  custom_label?: string;
  label: string;
  career_record?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SchedulePhase {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  hourly_rate?: number | null;
  hours_per_day?: number | null;
  working_days_per_week?: number | null;
  total_hours_worked?: number | null;
  overtime_hours?: number | null;
  overtime_rate?: number | null;
  overtime_multiplier?: number | null;
  total_earnings_override?: number | null;
}

export interface Experience {
  work_email?: string;
  id?: number;
  title: string;
  company: string;
  level?: string;
  location?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  description?: string;
  skills?: string[];
  logo?: string | null;
  employment_type?: 'full_time' | 'part_time' | 'internship' | 'contract' | 'freelance';
  is_promotion?: boolean;
  is_return_offer?: boolean;
  is_locked?: boolean;
  is_pinned?: boolean;
  position?: number | null;
  offer?: number | null;
  career_record?: number | null;
  hourly_rate?: number | null;
  hours_per_day?: number | null;
  working_days_per_week?: number | null;
  total_hours_worked?: number | null;
  overtime_hours?: number | null;
  overtime_rate?: number | null;
  overtime_multiplier?: number | null;
  total_earnings_override?: number | null;
  base_salary?: number | null;
  bonus?: number | null;
  equity?: number | null;
  team_history?: TeamEntry[];
  schedule_phases?: SchedulePhase[];
  created_at?: string;
  updated_at?: string;
}
