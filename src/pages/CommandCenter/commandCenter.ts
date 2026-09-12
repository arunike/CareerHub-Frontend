export interface CommandEvent {
  id: number;
  name: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  location_type?: string;
  location?: string;
  meeting_link?: string;
  application?: number | null;
  application_details?: { id: number; company: string; role: string } | null;
  category_details?: { name?: string } | null;
}

export interface CommandApplication {
  id: number;
  role_title: string;
  status: string | null;
  date_applied?: string;
  updated_at: string;
  company_details?: { name: string };
  has_reached_interview?: boolean;
}

export interface CommandTask {
  id: number;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string | null;
}

export interface CommandOffer {
  id: number;
  deadline?: string | null;
  final_decision_status?: string | null;
  application_details?: { company?: string; role?: string } | null;
}

export interface CommandRaise {
  date: string;
  type: string;
  base_before: number;
  base_after: number;
  company: string;
  roleTitle: string;
}

export interface RaiseSource {
  raise_history?: unknown;
  application_details?: { company?: string; role_title?: string; role?: string } | null;
}

// raise_history hangs off the offer, not the experience, and the server stores it as free JSON.
export const raisesFrom = (sources: RaiseSource[]): CommandRaise[] =>
  sources.flatMap((source) => {
    const history = source.raise_history;
    if (!Array.isArray(history)) return [];
    return history.flatMap((entry) => {
      const raise = entry as Record<string, unknown>;
      if (typeof raise?.date !== 'string') return [];
      return [
        {
          date: raise.date,
          type: typeof raise.type === 'string' ? raise.type : 'other',
          base_before: Number(raise.base_before) || 0,
          base_after: Number(raise.base_after) || 0,
          company: source.application_details?.company ?? 'Your role',
          roleTitle:
            source.application_details?.role_title ?? source.application_details?.role ?? '',
        },
      ];
    });
  });

// Keys from DEFAULT_APPLICATION_STAGES: settled or off the board, so not a lead that went cold.
export const CLOSED_STATUSES = new Set([
  'REJECTED',
  'GHOSTED',
  'REMOVED_FROM_SHEET',
  'ACCEPTED',
  'OFFER_REJECTED',
  'WITHDRAWN',
  'DECLINED',
  'CLOSED',
]);

// Every stage that means a conversation is happening, including the round-numbered ones.
export const INTERVIEWING_STATUSES = new Set([
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'ROUND_4',
  'FINAL_ROUND',
  'ONSITE',
  'INTERVIEW',
  'INTERVIEWING',
]);

export const isClosed = (status: string) => CLOSED_STATUSES.has(status.toUpperCase());
export const isInterviewing = (status: string) => INTERVIEWING_STATUSES.has(status.toUpperCase());

export const OFFER_HORIZON_DAYS = 7;

const DAY = 86400000;

// Null for anything unusable: a record with no date cannot be scheduled, chased or ranked.
const dayOf = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.length < 10) return null;
  const time = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(time) ? null : Math.floor(time / DAY);
};

export const daysBetween = (from: unknown, to: unknown): number | null => {
  const start = dayOf(from);
  const end = dayOf(to);
  return start === null || end === null ? null : end - start;
};

const atLeast = (value: number | null, floor: number) => value !== null && value >= floor;

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export interface UpcomingEvent {
  event: CommandEvent;
  daysAway: number;
  applicationId: number | null;
}

// Filtering on the date alone left a 09:00 interview under "Next up" all afternoon.
export const hasElapsed = (event: CommandEvent, todayIso: string, nowMinutes: number): boolean => {
  const gap = daysBetween(todayIso, event.date);
  if (gap === null) return false;
  if (gap !== 0) return gap < 0;
  const start = text(event.start_time).slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(start)) return false;
  const [hours, minutes] = start.split(':').map(Number);
  return hours * 60 + minutes < nowMinutes;
};

// Minutes since local midnight, which is the clock the dates on these records are written against.
export const minutesIntoDay = (now: Date = new Date()) => now.getHours() * 60 + now.getMinutes();

// Everything still ahead, soonest first. Not just interviews: a deadline or a call matters too.
export const upcomingEvents = (
  events: CommandEvent[],
  todayIso: string,
  nowMinutes: number = minutesIntoDay()
): UpcomingEvent[] => {
  const upcoming = events
    .filter(
      (event) =>
        atLeast(daysBetween(todayIso, event.date), 0) && !hasElapsed(event, todayIso, nowMinutes)
    )
    .sort(
      (a, b) =>
        text(a.date).localeCompare(text(b.date)) ||
        text(a.start_time).localeCompare(text(b.start_time))
    );
  return upcoming.map((event) => ({
    event,
    daysAway: daysBetween(todayIso, event.date) ?? 0,
    applicationId: event.application ?? event.application_details?.id ?? null,
  }));
};

export const nextEvent = (
  events: CommandEvent[],
  todayIso: string,
  nowMinutes: number = minutesIntoDay()
): UpcomingEvent | null => upcomingEvents(events, todayIso, nowMinutes)[0] ?? null;

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// Everything still open, overdue included: a task past its date is the one that needs you most.
export const openTasks = (tasks: CommandTask[]) =>
  tasks
    .filter((task) => task.status !== 'DONE')
    .sort((a, b) => {
      const aDated = dayOf(a.due_date) !== null;
      const bDated = dayOf(b.due_date) !== null;
      if (aDated !== bDated) return aDated ? -1 : 1;
      if (aDated && bDated) return text(a.due_date).localeCompare(text(b.due_date));
      return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
    });

// Due today or already past it, which is the count worth putting on the summary strip.
export const tasksDue = (tasks: CommandTask[], todayIso: string) =>
  openTasks(tasks).filter((task) => atLeast(daysBetween(task.due_date, todayIso), 0));

export interface ExpiringOffer {
  offer: CommandOffer;
  daysLeft: number;
}

// Settled offers are history; an expired one is a different problem from a closing one.
export const expiringOffers = (
  offers: CommandOffer[],
  todayIso: string,
  horizonDays = OFFER_HORIZON_DAYS
): ExpiringOffer[] =>
  offers
    .filter((offer) => !offer.final_decision_status)
    .map((offer) => ({ offer, daysLeft: daysBetween(todayIso, offer.deadline) }))
    .filter(
      (entry): entry is ExpiringOffer =>
        entry.daysLeft !== null && entry.daysLeft >= 0 && entry.daysLeft <= horizonDays
    )
    .sort((a, b) => a.daysLeft - b.daysLeft);

// The latest rise in base pay, which is the change worth restating on a summary.
export const latestPayChange = (raises: CommandRaise[], todayIso: string): CommandRaise | null => {
  const past = raises
    .filter((raise) => Number(raise.base_after) > Number(raise.base_before))
    .filter((raise) => atLeast(daysBetween(raise.date, todayIso), 0))
    .sort((a, b) => text(b.date).localeCompare(text(a.date)));
  return past[0] ?? null;
};

export interface PipelineStage {
  status: string;
  count: number;
}

// What the search actually looks like right now, which is the one thing always worth showing.
export const pipeline = (applications: CommandApplication[]): PipelineStage[] => {
  const counts = new Map<string, number>();
  for (const application of applications) {
    const status = text(application.status).toUpperCase() || 'UNKNOWN';
    if (isClosed(status)) continue;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
};

export interface OpenOffer {
  offer: CommandOffer;
  daysLeft: number | null;
}

// Every live offer, deadline or not: an offer on the table is worth seeing even without a clock.
export const openOffers = (offers: CommandOffer[], todayIso: string): OpenOffer[] =>
  offers
    .filter((offer) => !offer.final_decision_status)
    .map((offer) => ({ offer, daysLeft: daysBetween(todayIso, offer.deadline) }))
    .filter((entry) => entry.daysLeft === null || entry.daysLeft >= 0)
    .sort((a, b) => {
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });
