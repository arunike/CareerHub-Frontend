export interface ShareLink {
  id: number;
  uuid: string;
  title: string;
  host_display_name?: string;
  host_email?: string;
  public_note?: string;
  duration_days: number;
  booking_block_minutes: number;
  buffer_minutes: number;
  max_bookings_per_day: number;
  allow_reschedule_cancel: boolean;
  reschedule_cancel_deadline_hours: number;
  intake_questions: BookingIntakeQuestion[];
  booking_analytics?: {
    total: number;
    active: number;
    canceled: number;
    upcoming: number;
  };
  created_at: string;
  expires_at: string;
  is_active: boolean;
  is_expired: boolean;
  is_locked: boolean;
}

export interface BookingIntakeQuestion {
  id: string;
  label: string;
  required?: boolean;
}

export interface PublicBooking {
  id: number;
  uuid: string;
  share_link: number;
  share_link_title?: string;
  name: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  notes: string;
  intake_answers?: Record<string, string>;
  cancel_reason?: string;
  status: 'active' | 'canceled';
  is_locked: boolean;
  reschedule_url?: string;
  cancel_url?: string;
  ics_url?: string;
  created_at: string;
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
