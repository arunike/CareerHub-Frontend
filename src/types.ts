export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: string;
  byweekday?: number[];
}

export interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  [key: string]: unknown;
}

export interface GlobalAvailability {
  [key: string]: unknown;
}

export interface EventCategory {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

export interface Event {
  id: number;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: 'PT' | 'ET' | 'CT' | 'MT';
  category?: number;
  category_details?: EventCategory;
  color?: string;
  location_type: 'in_person' | 'virtual' | 'hybrid';
  location?: string;
  meeting_link?: string;
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule | null;
  parent_event?: number;
  application?: number | null;
  application_details?: {
    id: number;
    company: string;
    role: string;
    status: string;
  };
  notes?: string;
  reminder_minutes: number;
  created_at: string;
  updated_at: string;
  is_virtual?: boolean;
  is_locked?: boolean;
}

export interface Holiday {
  id: number;
  date: string;
  description: string;
  is_recurring?: boolean;
  is_locked?: boolean;
}

export interface Availability {
  date: string;
  day_name: string;
  readable_date: string;
  availability: string | null;
}

export interface UserSettings {
  id: number;
  work_start_time: string;
  work_end_time: string;
  work_days: number[];
  default_event_duration: number;
  buffer_time: number;
  primary_timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notification_preferences: NotificationPreferences;
  global_availability: GlobalAvailability;
  ghosting_threshold_days: number;
  default_event_category?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConflictAlert {
  id: number;
  event1: number;
  event2: number;
  event1_details: Event;
  event2_details: Event;
  detected_at: string;
  resolved: boolean;
}

export interface Document {
  id: number;
  title: string;
  file: string;
  document_type: 'RESUME' | 'COVER_LETTER' | 'PORTFOLIO' | 'OTHER';
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

export interface WeeklyReviewItemApplication {
  id: number;
  company: string;
  role_title: string;
  date_applied: string;
  status: string;
}

export interface WeeklyReviewItemInterview {
  id: number;
  name: string;
  date: string;
  company?: string | null;
  role_title?: string | null;
}

export interface WeeklyReviewItemTask {
  id: number;
  title: string;
  status: 'TODO' | 'IN_PROGRESS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string | null;
  is_overdue: boolean;
}

export interface WeeklyReview {
  start_date: string;
  end_date: string;
  applications_sent: number;
  interviews_done: number;
  next_actions_count: number;
  applications: WeeklyReviewItemApplication[];
  interviews: WeeklyReviewItemInterview[];
  next_actions: WeeklyReviewItemTask[];
  summary_text: string;
  generated_at: string;
}

export interface ShareLink {
  id: number;
  uuid: string;
  title: string;
  duration_days: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  is_expired: boolean;
}

export interface BookingSlot {
  start_time: string;
  end_time: string;
  label: string;
}

export interface BookingDayAvailability {
  date: string;
  day_name: string;
  readable_date: string;
  slots: BookingSlot[];
}
