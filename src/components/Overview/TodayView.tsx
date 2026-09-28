import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  HistoryOutlined,
  MessageOutlined,
  SolutionOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import StatStrip from './StatStrip';
import SummaryRowList from './SummaryRowList';
import type { Stat } from './StatStrip';
import SummaryCard from './SummaryCard';
import type { SummaryRow } from './SummaryCard';
import { StatusBadge } from '../Applications/ApplicationBadges';
import { roundTiming } from '../../utils/Overview/overview';
import { roundTimingLabel } from '../../utils/Overview/roundTimingLabel';
import type { ApplicationStage } from '../../constants/applicationStages';
import {
  expiringOffers,
  isInterviewing,
  nextEvent,
  openOffers,
  openTasks,
  pipeline,
  tasksDue,
  upcomingEvents,
} from '../../utils/Overview/overview';
import { stageLabel } from '../../utils/Overview/stageLabel';
import type {
  CommandApplication,
  CommandEvent,
  CommandOffer,
  CommandTask,
} from '../../utils/Overview/overview';
import { canSayAllClear, type CommandSource } from '../../utils/Overview/overviewSources';
import type { InterviewPrep } from '../../utils/Overview/interviewPrep';
import { stalledRounds } from '../../utils/Overview/stageVelocity';
import type { TimelineEntryLike } from '../../utils/Overview/stageVelocity';
import { bucketApplications, inBucket, STALE_AFTER_DAYS } from '../../utils/Overview/todayBuckets';
import type { BucketedApplication } from '../../utils/Overview/todayBuckets';
import { dueReviews } from '../../utils/OfferComparison/decisionJournal';
import type { DecisionJournalEntry } from '../../utils/OfferComparison/decisionJournal';

const dayLabel = (days: number) =>
  days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;

export interface ViewData {
  events: CommandEvent[];
  applications: CommandApplication[];
  tasks: CommandTask[];
  offers: CommandOffer[];
  journals: DecisionJournalEntry[];
  timeline: TimelineEntryLike[];
  failed: CommandSource[];
  stages: ApplicationStage[];
  ghostAfterDays?: number;
  todayIso: string;
}

interface TodayProps extends ViewData {
  // What the last recorded round said to work on, when another is booked.
  prep?: InterviewPrep | null;
}

const TodayView = ({
  events,
  applications,
  tasks,
  offers,
  journals,
  timeline,
  failed,
  stages,
  ghostAfterDays,
  todayIso,
  prep,
}: TodayProps) => {
  const soonest = useMemo(() => nextEvent(events, todayIso), [events, todayIso]);
  const ahead = useMemo(() => upcomingEvents(events, todayIso), [events, todayIso]);
  const allTasks = useMemo(() => openTasks(tasks), [tasks]);
  const due = useMemo(() => tasksDue(tasks, todayIso), [tasks, todayIso]);
  const closing = useMemo(() => expiringOffers(offers, todayIso), [offers, todayIso]);
  const lookBacks = useMemo(() => dueReviews(journals, todayIso), [journals, todayIso]);
  // One pass, one bucket each: three cards measuring the same silence listed a role three times.
  const buckets = useMemo(
    () => bucketApplications(applications, todayIso),
    [applications, todayIso]
  );
  const moving = useMemo(() => inBucket(buckets, 'moving'), [buckets]);
  const nudge = useMemo(() => inBucket(buckets, 'nudge'), [buckets]);
  const stale = useMemo(() => inBucket(buckets, 'stale'), [buckets]);
  const cold = useMemo(() => inBucket(buckets, 'cold'), [buckets]);

  // Running long is an annotation on a row, not a card: as a card it repeated the whole list.
  const overdueByApplication = useMemo(() => {
    const map = new Map<number, number>();
    for (const round of stalledRounds(applications, timeline, todayIso)) {
      map.set(round.application.id, round.typical);
    }
    return map;
  }, [applications, timeline, todayIso]);

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

  const applicationRow = (
    { application }: BucketedApplication,
    prefix: string,
    meta: ReactNode
  ): SummaryRow => ({
    id: `${prefix}-${application.id}`,
    to: `/applications?open=${application.id}`,
    title: `${application.company_details?.name ?? 'Unknown company'} \u00b7 ${application.role_title}`,
    meta,
    // The stage's own colour, so a round reads the same here as on the applications table.
    trailing: <StatusBadge status={String(application.status ?? '')} stages={stages} />,
  });

  const quietMeta = ({ application, daysQuiet }: BucketedApplication) => {
    const typical = overdueByApplication.get(application.id);
    const silence = `Quiet ${daysQuiet} ${daysQuiet === 1 ? 'day' : 'days'}`;
    return typical === undefined
      ? silence
      : `${silence} \u00b7 this round usually takes ${Math.round(typical)}`;
  };

  // The one card that asks for an action, so it leads: a reply has landed and the thread is cooling.
  const nudgeCard = nudge.length ? (
    <SummaryCard
      title="Worth a nudge"
      icon={MessageOutlined}
      tone="urgent"
      count={nudge.length}
      seeAll={{ to: '/applications', label: 'All applications' }}
      previewCount={6}
      moreLabel={(hidden) => `Show ${hidden} more worth a nudge`}
      rows={nudge.map((entry) => applicationRow(entry, 'nudge', quietMeta(entry)))}
    />
  ) : null;

  const movingCard = moving.length ? (
    <SummaryCard
      title="In play"
      icon={SolutionOutlined}
      count={moving.length}
      seeAll={{ to: '/applications', label: 'All applications' }}
      previewCount={6}
      moreLabel={(hidden) => `Show ${hidden} more in play`}
      rows={moving.map((entry) => {
        const timing = roundTiming({
          application: entry.application,
          events,
          todayIso,
          ghostAfterDays,
        });
        const typical = overdueByApplication.get(entry.application.id);
        return applicationRow(
          entry,
          'moving',
          typical === undefined
            ? roundTimingLabel(timing)
            : `${roundTimingLabel(timing)} \u00b7 running long for this round`
        );
      })}
    />
  ) : null;

  const live = useMemo(() => openOffers(offers, todayIso), [offers, todayIso]);
  const stagesInPlay = useMemo(() => pipeline(applications), [applications]);
  const inRounds = useMemo(
    () => buckets.filter((row) => isInterviewing(String(row.application.status ?? ''))).length,
    [buckets]
  );

  // Counts, not a list: with nothing booked the page was three rows tall on a full pipeline.
  const stats: Stat[] = [
    {
      label: 'Still open',
      value: buckets.length,
      hint: buckets.length ? 'not closed out' : 'nothing live',
      to: '/applications',
    },
    {
      label: 'In rounds',
      value: inRounds,
      hint: inRounds ? 'interviewing now' : 'none interviewing',
      to: '/applications',
    },
    {
      label: 'Offers open',
      value: live.length,
      hint: live.length ? 'awaiting a decision' : 'none on the table',
      tone: live.length ? 'good' : 'neutral',
      to: '/offers',
    },
    {
      label: 'Gone quiet',
      value: stale.length,
      hint: `${STALE_AFTER_DAYS / 7} weeks or more`,
      tone: stale.length ? 'warn' : 'neutral',
      // Opened from the cell that already counts them, rather than a section of its own.
      ...(stale.length
        ? {
            panel: {
              title: `Quiet ${STALE_AFTER_DAYS / 7} weeks or more`,
              content: (
                <div className="-mx-4 w-[min(30rem,80vw)] max-w-full">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <SummaryRowList
                      rows={stale.map((entry) => applicationRow(entry, 'stale', quietMeta(entry)))}
                    />
                  </div>
                  <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-2.5 dark:border-white/[0.07]">
                    {cold.length > 0 && (
                      <span className="text-[11px] text-slate-400 dark:text-ink-500">
                        {cold.length} sent and never answered
                      </span>
                    )}
                    <Link
                      to="/applications"
                      className="ml-auto text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-300"
                    >
                      All applications
                    </Link>
                  </div>
                </div>
              ),
            },
          }
        : { to: '/applications' }),
    },
  ];

  const pipelineCard = stagesInPlay.length ? (
    <SummaryCard
      title="Where things stand"
      icon={SolutionOutlined}
      count={buckets.length}
      seeAll={{ to: '/applications', label: 'All applications' }}
      rows={stagesInPlay.map(
        (stage): SummaryRow => ({
          id: `stage-${stage.status}`,
          to: `/applications?status=${encodeURIComponent(stage.status)}`,
          title: stageLabel(stage.status, stages),
          trailing: (
            <span className="inline-flex min-w-6 justify-end text-[13px] font-semibold tabular-nums text-slate-700 dark:text-ink-100">
              {stage.count}
            </span>
          ),
        })
      )}
    />
  ) : null;

  const cards = [
    nowCard,
    nudgeCard,
    movingCard,
    scheduleCard,
    closingCard,
    journalCard,
    taskCard,
    pipelineCard,
  ].filter(Boolean);
  // Split by priority, not interleaved: the card asking for an action must read first.
  const main = cards.slice(0, Math.ceil(cards.length / 2));
  const rail = cards.slice(Math.ceil(cards.length / 2));

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
            {prep && (
              <p className="mt-2 w-full rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600 dark:bg-white/[0.04] dark:text-ink-300">
                <span className="font-semibold text-slate-700 dark:text-ink-100">
                  From your {prep.stage || 'last round'} notes
                </span>{' '}
                &middot; {prep.nextSteps || prep.weakAreas}
              </p>
            )}
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

      {/* Under the hero, above the work: the shape of the search, not a replacement for it. */}
      {buckets.length > 0 && <StatStrip stats={stats} />}

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
            <>
              <p className="text-[15px] font-semibold text-slate-900 dark:text-ink-50">
                Nothing needs you today
              </p>
              {/* A quiet day with a large quiet pile is a prompt to prune, not just reassurance. */}
              <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-500 dark:text-ink-400">
                {stale.length > 0 ? (
                  <>
                    {stale.length === 1
                      ? 'One conversation has'
                      : `${stale.length} conversations have`}{' '}
                    been quiet for {STALE_AFTER_DAYS / 7} weeks or more
                    {cold.length > 0 ? `, and ${cold.length} were never answered at all` : ''}.
                    Deciding which to close is worth more than another follow-up.
                  </>
                ) : (
                  <>
                    Check{' '}
                    <Link
                      to="?view=week"
                      className="font-semibold text-blue-600 dark:text-blue-300"
                    >
                      This week
                    </Link>{' '}
                    for how the search is going.
                  </>
                )}
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default TodayView;
