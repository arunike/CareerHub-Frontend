export interface ApplicationStats {
  total: number;
  offers: number;
  ghosted: number;
  active_interviews: number;
  total_interviews: number;
  responded_count: number;
  response_rate: string;
  offer_rate: string;
  recent_applications_30d: number;
  locations: Array<{ name: string; count: number }>;
  application_age_breakdown: Array<{ name: string; count: number }>;
  // Applications per day applied, keyed yyyy-MM-dd.
  daily_applied: Record<string, number>;
  // Every year with applications, never narrowed by the year filter.
  years: number[];
  field_completeness: Array<{
    field: string;
    label: string;
    missing: number;
    total: number;
    unlocks: string;
  }>;
}

export interface ResponseRateSegment {
  name: string;
  total: number;
  responded: number;
  response_rate: number;
}

export interface ApplicationTimelineAnalytics {
  average_time_to_interview_days: number | null;
  time_to_interview_sample_size: number;
  average_days_to_offer: number | null;
  days_to_offer_sample_size: number;
  stage_conversion: Array<{
    key: string;
    label: string;
    reached_count: number;
    current_count: number;
    conversion_rate: number;
  }>;
  stale_threshold_days: number;
  stale_in_stage: Array<{
    application_id: number;
    company: string;
    role_title: string;
    status: string;
    status_label: string;
    days_in_stage: number;
    last_stage_date?: string | null;
    source: string;
    // Median days this stage normally takes. null when the stage has too little history.
    typical_days?: number | null;
    days_over_typical?: number | null;
  }>;
  response_time_buckets: Array<{
    label: string;
    max_days: number | null;
    count: number;
    cumulative_share: number;
  }>;
  response_time_sample_size: number;
  median_days_to_response: number | null;
  p90_days_to_response: number | null;
  // The p90 of observed reply times.
  suggested_followup_days: number | null;
  silent_past_followup_count: number;
  open_without_response_count: number;
  response_rate_by_source: Array<ResponseRateSegment>;
  response_rate_by_location: Array<ResponseRateSegment>;
  response_rate_by_level: Array<ResponseRateSegment>;
  // null when either window is too small to compare.
  response_trend: {
    window_days: number;
    matured_before: string;
    recent: { applied: number; responded: number; response_rate: number };
    previous: { applied: number; responded: number; response_rate: number };
    delta: number;
  } | null;
  interview_links: {
    total_events: number;
    linked_events: number;
    unlinked_events: number;
    interviews_per_offer: number | null;
  };
  stage_durations: Array<{
    key: string;
    label: string;
    median_days: number;
    p90_days: number | null;
    sample_size: number;
  }>;
  min_duration_sample: number;
  offer_rate_by_source: Array<{
    name: string;
    total: number;
    offers: number;
    offer_rate: number;
  }>;
  offer_rate_by_company: Array<{
    name: string;
    total: number;
    offers: number;
    offer_rate: number;
  }>;
  total_applications: number;
  offer_count?: number;
  offer_rate?: number;
  // Terminal results: offer, rejected, ghosted.
  outcomes: Array<{ key: string; label: string; count: number }>;
  responded_count: number;
  response_rate: number;
  ghosted_count: number;
  ghost_rate: number;
  biggest_drop: { from_label: string; to_label: string; lost: number } | null;
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
