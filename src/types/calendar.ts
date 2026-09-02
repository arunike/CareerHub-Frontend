export interface TeamEntry {
  id: string;
  name: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  norms: string;
  manager?: string;
  is_locked?: boolean;
}

export interface RaiseEntry {
  id: string;
  date: string;
  type:
    | 'promotion'
    | 'merit'
    | 'market'
    | 'cola'
    | 'retention'
    | 'equity_refresh'
    | 'role_change'
    | 'correction'
    | 'other';
  label?: string;
  base_before: number;
  base_after: number;
  bonus_before: number;
  bonus_after: number;
  equity_before: number;
  equity_after: number;
  notes?: string;
}

export interface HolidayTab {
  id: string;
  name: string;
  color?: string;
  locked?: boolean;
}

export interface EmploymentType {
  value: string;
  label: string;
  color: string;
  locked?: boolean;
}

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
  is_locked?: boolean;
}

export interface Event {
  id: number;
  name: string;
  date: string;
  // Null for a single-day event; otherwise the last day it spans.
  end_date?: string | null;
  // Set on a single day that was edited out of a multi-day span.
  span_parent?: number | null;
  override_date?: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
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
  is_all_day?: boolean;
  is_locked?: boolean;
}

export interface Holiday {
  id: number;
  date: string;
  group_id?: string;
  description: string;
  holiday_type?: 'custom' | 'federal';
  is_recurring: boolean;
  is_locked: boolean;
  is_ignored?: boolean;
  tab?: string | null;
  tab_color?: string;
  tab_name?: string;
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
  work_time_ranges: { start: string; end: string; days?: number[] }[];
  work_days: number[];
  default_event_duration: number;
  buffer_time: number;
  availability_weeks: number;
  primary_timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notification_preferences: NotificationPreferences;
  global_availability: GlobalAvailability;
  ghosting_threshold_days: number;
  default_mpg?: number | string;
  default_gas_price_per_gallon?: number | string;
  default_event_category?: number | null;
  ignored_federal_holidays?: string[];
  employment_types?: EmploymentType[];
  holiday_tabs?: HolidayTab[];
  default_holiday_color?: string;
  federal_holiday_color?: string;
  application_stages?: Array<{
    key: string;
    label: string;
    shortLabel: string;
    tone: string;
    locked?: boolean;
  }>;
  hidden_nav_items?: string[];
  // Income source keys and tax years left out of the Income page pickers.
  hidden_income_roles?: string[];
  hidden_income_years?: number[];
  nav_item_order?: string[];
  nav_item_labels?: Record<string, string>;
  mobile_toolbar_items?: string[];
  custom_analytics_widgets?: Array<Record<string, unknown>>;
  // Keyed by dashboard: jobHunt, availability.
  analytics_widget_order?: Record<string, string[]>;
  analytics_widgets_enabled?: Record<string, string[]>;
  contact_network_positions?: {
    nodes?: Record<string, { x: number; y: number }>;
    labels?: Record<string, number>;
  };
  is_locked?: boolean;
  ai_provider_adapter?: 'claude' | 'gemini' | 'openai' | 'openrouter' | 'custom';
  ai_provider_endpoint?: string;
  ai_provider_model?: string;
  ai_provider_api_key?: string;
  ai_provider_api_key_configured?: boolean;
  ai_provider_api_key_masked?: string;
  account_deletion_requested_at?: string | null;
  account_deletion_scheduled_for?: string | null;
  display_name?: string;
  profile_picture?: string | null;
  email?: string;
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
