import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  HistoryOutlined,
  SolutionOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import SummaryCard from './SummaryCard';
import type { SummaryRow } from './SummaryCard';
import { findApplicationStatus, type ApplicationStage } from '../../constants/applicationStages';
import {
  expiringOffers,
  isInterviewing,
  nextEvent,
  openTasks,
  tasksDue,
  upcomingEvents,
} from './commandCenter';
import type { CommandApplication, CommandEvent, CommandOffer, CommandTask } from './commandCenter';
import { canSayAllClear, type CommandSource } from './commandCenterSources';
import { dueReviews } from '../OfferComparison/decisionJournal';
import type { DecisionJournalEntry } from '../OfferComparison/decisionJournal';

const dayLabel = (days: number) =>
  days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;

export interface ViewData {
  events: CommandEvent[];
  applications: CommandApplication[];
  tasks: CommandTask[];
  offers: CommandOffer[];
  journals: DecisionJournalEntry[];
  failed: CommandSource[];
  stages: ApplicationStage[];
  todayIso: string;
}

const TodayView = ({
  events,
  applications,
  tasks,
  offers,
  journals,
  failed,
  stages,
  todayIso,
}: ViewData) => {
  const soonest = useMemo(() => nextEvent(events, todayIso), [events, todayIso]);
  const ahead = useMemo(() => upcomingEvents(events, todayIso), [events, todayIso]);
  const allTasks = useMemo(() => openTasks(tasks), [tasks]);
  const due = useMemo(() => tasksDue(tasks, todayIso), [tasks, todayIso]);
  const closing = useMemo(() => expiringOffers(offers, todayIso), [offers, todayIso]);
  const lookBacks = useMemo(() => dueReviews(journals, todayIso), [journals, todayIso]);
  // Live conversations, longest untouched first. Not a count — the actual threads to work.
  const inRounds = useMemo(
    () =>
      applications
        .filter((application) => isInterviewing(String(application.status ?? '')))
        .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at))),
    [applications]
  );

  // Anything landing today that the hero is not already announcing.
  const alsoToday = ahead.filter(
    (entry) => entry.daysAway === 0 && entry.event.id !== soonest?.event.id
  );
  const later = ahead.filter((entry) => entry.event.id !== soonest?.event.id && entry.daysAway > 0);
  const dueIds = new Set(due.map((task) => task.id));
  const restOfTasks = allTasks.filter((task) => !dueIds.has(task.id));

  const nowRows: SummaryRow[] = [
    ...alsoToday.map(
      ({ event }): SummaryRow => ({
        id: `now-event-${event.id}`,
        to: `/events?event=${event.id}`,
        title: event.application_details
          ? `${event.application_details.company} \u00b7 ${event.name}`
          : event.name,
        meta: event.start_time ? `at ${event.start_time.slice(0, 5)}` : 'Today',
        leading: <CalendarOutlined className="text-[12px] text-blue-500" />,
      })
    ),
    ...due.map(
      (task): SummaryRow => ({
        id: `now-task-${task.id}`,
        to: `/tasks?taskId=${task.id}`,
        title: task.title,
        meta: task.due_date ? dayjs(task.due_date).format('D MMM') : undefined,
        leading: <CheckSquareOutlined className="text-[12px] text-amber-500" />,
        trailing: (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/12 dark:text-amber-300">
            {task.due_date && task.due_date < todayIso ? 'Overdue' : 'Today'}
          </span>
        ),
      })
    ),
  ];

  // The alarm layer: work with a date on it that has already arrived.
  const nowCard = nowRows.length ? (
    <SummaryCard
      title="Needs you today"
      icon={ThunderboltOutlined}
      tone="urgent"
      count={nowRows.length}
      rows={nowRows}
    />
  ) : null;

  const scheduleCard = later.length ? (
    <SummaryCard
      title="Coming up"
      icon={CalendarOutlined}
      count={later.length}
      seeAll={{ to: '/events', label: 'All events' }}
      rows={later.slice(0, 6).map(
        ({ event, daysAway }): SummaryRow => ({
          id: `event-${event.id}`,
          to: `/events?event=${event.id}`,
          title: event.application_details
            ? `${event.application_details.company} \u00b7 ${event.name}`
            : event.name,
          meta: `${dayjs(event.date).format('ddd D MMM')}${
            event.start_time ? ` at ${event.start_time.slice(0, 5)}` : ''
          }`,
          trailing: (
            <span className="text-[11px] text-slate-400 dark:text-ink-500">
              {dayLabel(daysAway)}
            </span>
          ),
        })
      )}
      footnote={later.length > 6 ? `${later.length - 6} more on the calendar` : null}
    />
  ) : null;

  // Only offers with a clock on them; the rest are a this-week question, not a today one.
  const closingCard = closing.length ? (
    <SummaryCard
      title="Offers closing"
      icon={DollarOutlined}
      tone="urgent"
      count={closing.length}
      seeAll={{ to: '/offers', label: 'All offers' }}
      rows={closing.map(
        ({ offer, daysLeft }): SummaryRow => ({
          id: `closing-${offer.id}`,
          to: `/offers?offer=${offer.id}`,
          title: offer.application_details?.company ?? `Offer #${offer.id}`,
          meta: offer.application_details?.role,
          trailing: (
            <span
              className={`text-[11px] font-semibold ${
                daysLeft <= 1
                  ? 'text-rose-600 dark:text-rose-300'
                  : 'text-amber-600 dark:text-amber-300'
              }`}
            >
              {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
            </span>
          ),
        })
      )}
    />
  ) : null;

  // A 30/90-day look-back has a date on it like anything else, so it belongs on Today once it lands.
  const journalCard = lookBacks.length ? (
    <SummaryCard
      title="Decision reviews due"
      icon={HistoryOutlined}
      count={lookBacks.length}
      seeAll={{ to: '/offers', label: 'All offers' }}
      rows={lookBacks.slice(0, 5).map(
        ({ entry, milestone, dueOn, daysAway }): SummaryRow => ({
          id: `journal-${entry.id ?? entry.offer}-${milestone}`,
          to: `/offers?offer=${entry.offer}`,
          title: `${entry.company_name || 'An offer'} \u00b7 ${milestone}-day look-back`,
          meta:
            entry.decision === 'ACCEPTED'
              ? `Accepted \u00b7 due ${dayjs(dueOn).format('D MMM')}`
              : `Declined \u00b7 due ${dayjs(dueOn).format('D MMM')}`,
          trailing: (
            <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">
              {daysAway === 0 ? 'Today' : `${Math.abs(daysAway)}d ago`}
            </span>
          ),
        })
      )}
      footnote={lookBacks.length > 5 ? `${lookBacks.length - 5} more to look back on` : null}
    />
  ) : null;

  const taskCard = restOfTasks.length ? (
    <SummaryCard
      title="Open tasks"
      icon={CheckSquareOutlined}
      count={restOfTasks.length}
      seeAll={{ to: '/tasks', label: 'All tasks' }}
      rows={restOfTasks.slice(0, 6).map(
        (task): SummaryRow => ({
          id: `task-${task.id}`,
          to: `/tasks?taskId=${task.id}`,
          title: task.title,
          meta: task.due_date ? `Due ${dayjs(task.due_date).format('D MMM')}` : 'No date',
          trailing:
            task.priority === 'HIGH' ? (
              <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:bg-rose-500/12 dark:text-rose-300">
                High
              </span>
            ) : null,
        })
      )}
      footnote={restOfTasks.length > 6 ? `${restOfTasks.length - 6} more on the tasks page` : null}
    />
  ) : null;

  const activeCard = inRounds.length ? (
    <SummaryCard
      title="In interview rounds"
      icon={SolutionOutlined}
      count={inRounds.length}
      seeAll={{ to: '/applications', label: 'All applications' }}
      rows={inRounds.slice(0, 6).map(
        (application): SummaryRow => ({
          id: `round-${application.id}`,
          to: `/applications?open=${application.id}`,
          title: `${application.company_details?.name ?? 'Unknown company'} \u00b7 ${application.role_title}`,
          meta: `Last touched ${dayjs(application.updated_at).format('D MMM')}`,
          trailing: (
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/12 dark:text-blue-300">
              {findApplicationStatus(String(application.status ?? ''), stages)?.shortLabel ??
                application.status}
            </span>
          ),
        })
      )}
      footnote={
        inRounds.length > 6 ? `${inRounds.length - 6} more in an interview round` : undefined
      }
    />
  ) : null;

  // Two balanced columns rather than a fixed main and rail: on a quiet day the rail was just a void.
  const cards = [nowCard, activeCard, scheduleCard, closingCard, journalCard, taskCard].filter(
    Boolean
  );
  const main = cards.filter((_, index) => index % 2 === 0);
  const rail = cards.filter((_, index) => index % 2 === 1);

  return (
    <div className="space-y-5">
      {/* The next thing with a fixed time leads, because it is the one you cannot reschedule away. */}
      {soonest && (
        <section className="enterprise-card relative overflow-hidden p-5">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500"
          />
          <div className="flex flex-wrap items-center gap-4 pl-2">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-400/20">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em]">
                {dayjs(soonest.event.date).format('MMM')}
              </span>
              <span className="text-2xl font-semibold leading-none tabular-nums">
                {dayjs(soonest.event.date).format('D')}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-blue-600 dark:text-blue-300">
                Next up · {dayLabel(soonest.daysAway)}
              </p>
              <p className="mt-1 truncate text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-ink-50">
                {soonest.event.application_details
                  ? `${soonest.event.application_details.company} · ${soonest.event.name}`
                  : soonest.event.name}
              </p>
              <p className="mt-0.5 text-[12.5px] text-slate-500 sm:truncate dark:text-ink-400">
                {dayjs(soonest.event.date).format('dddd D MMMM')}
                {soonest.event.start_time ? ` at ${soonest.event.start_time.slice(0, 5)}` : ''}
                {soonest.event.location ? ` · ${soonest.event.location}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {soonest.applicationId && (
                <Link
                  to={`/applications?open=${soonest.applicationId}`}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-white/[0.10] dark:text-ink-100 dark:hover:border-blue-400/40"
                >
                  Open application
                </Link>
              )}
              <Link
                to="/events"
                className="inline-flex min-h-9 items-center rounded-lg bg-blue-600 px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Open event
              </Link>
            </div>
          </div>
        </section>
      )}

      {cards.length > 0 && (
        <div className={`grid gap-5 ${rail.length ? 'lg:grid-cols-2' : ''}`}>
          <div className="space-y-5">
            {main.map((card, index) => (
              <div key={index}>{card}</div>
            ))}
          </div>
          {rail.length > 0 && (
            <div className="space-y-5">
              {rail.map((card, index) => (
                <div key={index}>{card}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reassurance only where every source answered; otherwise this is a gap, not a quiet day. */}
      {!soonest && cards.length === 0 && canSayAllClear(failed) && (
        <section className="enterprise-card p-10 text-center">
          {applications.length === 0 ? (
            // An empty account is not a quiet day; pointing it at weekly reporting gives it nothing.
            <>
              <p className="text-[15px] font-semibold text-slate-900 dark:text-ink-50">
                Nothing is being tracked yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-500 dark:text-ink-400">
                Add the first role you have applied for, and this page starts showing what needs you
                each day.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  to="/applications?action=create"
                  className="inline-flex min-h-9 items-center rounded-lg bg-blue-600 px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Add first application
                </Link>
                <Link
                  to="/applications?action=job-import"
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-white/[0.10] dark:text-ink-100 dark:hover:border-blue-400/40"
                >
                  Import from a job link
                </Link>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-slate-500 dark:text-ink-400">
              Nothing needs you today. Check{' '}
              <Link to="?view=week" className="font-semibold text-blue-600 dark:text-blue-300">
                This week
              </Link>{' '}
              for how the search is going.
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default TodayView;
