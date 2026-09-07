import { daysBetween, isClosed } from './commandCenter';
import type { CommandApplication, CommandEvent, CommandOffer } from './commandCenter';

export const WEEK_DAYS = 7;
const DAY_MS = 86400000;
export const FOLLOW_UP_AFTER_DAYS = 10;

// A rejection is a reply; GHOSTED is the absence of one and REMOVED_FROM_SHEET is bookkeeping.
const UNANSWERED = new Set(['APPLIED', 'GHOSTED', 'REMOVED_FROM_SHEET', '']);

const hasReplied = (application: CommandApplication) =>
  !UNANSWERED.has(status(application)) || Boolean(application.has_reached_interview);

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const status = (application: CommandApplication) => text(application.status).toUpperCase();

const within = (from: unknown, todayIso: string, days: number) => {
  const gap = daysBetween(from, todayIso);
  return gap !== null && gap >= 0 && gap < days;
};

export const appliedThisWeek = (applications: CommandApplication[], todayIso: string) =>
  applications.filter((application) =>
    within(application.date_applied ?? application.updated_at, todayIso, WEEK_DAYS)
  );

// Touched in the last week and no longer sitting at Applied: something actually moved.
export const movedThisWeek = (applications: CommandApplication[], todayIso: string) =>
  applications.filter(
    (application) =>
      within(application.updated_at, todayIso, WEEK_DAYS) &&
      status(application) !== 'APPLIED' &&
      status(application) !== ''
  );

export interface ResponseRate {
  answered: number;
  sent: number;
  rate: number;
}

// Of everything you sent, how much came back — the number that says whether the pitch is landing.
export const responseRate = (applications: CommandApplication[]): ResponseRate => {
  const sent = applications.filter((application) => status(application) !== '').length;
  const answered = applications.filter(
    (application) => !UNANSWERED.has(status(application)) || application.has_reached_interview
  ).length;
  return { answered, sent, rate: sent === 0 ? 0 : answered / sent };
};

export interface FollowUp {
  application: CommandApplication;
  daysQuiet: number;
}

const quietOpen = (
  applications: CommandApplication[],
  todayIso: string,
  afterDays: number
): FollowUp[] =>
  applications
    .filter((application) => !isClosed(status(application)))
    .map((application) => ({
      application,
      daysQuiet: daysBetween(application.updated_at, todayIso),
    }))
    .filter((entry): entry is FollowUp => entry.daysQuiet !== null && entry.daysQuiet >= afterDays)
    .sort((a, b) => b.daysQuiet - a.daysQuiet);

// Only conversations someone joined: chasing every unanswered application returns nearly every row.
export const needsFollowUp = (
  applications: CommandApplication[],
  todayIso: string,
  afterDays = FOLLOW_UP_AFTER_DAYS
): FollowUp[] =>
  quietOpen(applications, todayIso, afterDays).filter((entry) => hasReplied(entry.application));

// The other half: sent, never answered, and quiet. A number worth knowing, not a list to work.
export const goneCold = (
  applications: CommandApplication[],
  todayIso: string,
  afterDays = FOLLOW_UP_AFTER_DAYS
): FollowUp[] =>
  quietOpen(applications, todayIso, afterDays).filter((entry) => !hasReplied(entry.application));

export interface FocusItem {
  id: string;
  kind: 'event' | 'offer';
  title: string;
  detail: string;
  date: string;
  daysAway: number;
  to: string;
}

// One list, both kinds: next week is a single stretch of time, not two separate calendars.
export const nextWeekFocus = (
  events: CommandEvent[],
  offers: CommandOffer[],
  todayIso: string,
  days = WEEK_DAYS
): FocusItem[] => {
  const items: FocusItem[] = [];

  for (const event of events) {
    const away = daysBetween(todayIso, event.date);
    if (away === null || away < 0 || away > days) continue;
    items.push({
      id: `event-${event.id}`,
      kind: 'event',
      title: text(event.name) || 'Untitled event',
      detail: event.application_details?.company ?? 'Calendar',
      date: text(event.date),
      daysAway: away,
      to: '/events',
    });
  }

  for (const offer of offers) {
    if (offer.final_decision_status) continue;
    const away = daysBetween(todayIso, offer.deadline);
    if (away === null || away < 0 || away > days) continue;
    items.push({
      id: `offer-${offer.id}`,
      kind: 'offer',
      title: `${offer.application_details?.company ?? 'Offer'} decision due`,
      detail: offer.application_details?.role ?? 'Offer deadline',
      date: text(offer.deadline),
      daysAway: away,
      to: '/offers',
    });
  }

  return items.sort((a, b) => a.daysAway - b.daysAway || a.title.localeCompare(b.title));
};

export interface WeekWindow {
  start: string;
  end: string;
}

// Monday to Sunday. A review that resets mid-week reads as though the work restarted.
export const weekWindow = (todayIso: string): WeekWindow => {
  const time = Date.parse(`${todayIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(time)) return { start: todayIso, end: todayIso };
  // getUTCDay is 0 on Sunday, which belongs to the week that started six days earlier.
  const weekday = (new Date(time).getUTCDay() + 6) % 7;
  const iso = (offset: number) => new Date(time + offset * DAY_MS).toISOString().slice(0, 10);
  return { start: iso(-weekday), end: iso(6 - weekday) };
};

export interface WeekStats {
  applied: number;
  moved: number;
  rate: ResponseRate;
  followUps: number;
}

// A sentence, because four numbers in a row do not tell you whether the week went well.
export const weekHeadline = ({ applied, moved, rate, followUps }: WeekStats): string => {
  if (applied === 0 && moved === 0 && followUps === 0) {
    return rate.sent === 0
      ? 'Nothing logged yet. Add an application and this review starts filling in.'
      : 'A quiet week: nothing sent and nothing moved.';
  }
  const parts: string[] = [];
  parts.push(applied === 1 ? 'You sent 1 application' : `You sent ${applied} applications`);
  if (moved > 0) parts.push(moved === 1 ? '1 moved forward' : `${moved} moved forward`);
  if (followUps > 0) {
    parts.push(followUps === 1 ? '1 is worth chasing' : `${followUps} are worth chasing`);
  }
  return `${parts.join(', ')}.`;
};
