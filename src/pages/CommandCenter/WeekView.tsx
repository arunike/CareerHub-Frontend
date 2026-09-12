import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  AimOutlined,
  CalendarOutlined,
  DollarOutlined,
  MessageOutlined,
  SendOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import SummaryCard from './SummaryCard';
import StatStrip from './StatStrip';
import PayChangeCard from './PayChangeCard';
import type { SummaryRow } from './SummaryCard';
import type { Stat } from './StatStrip';
import type { ViewData } from './TodayView';
import { findApplicationStatus } from '../../constants/applicationStages';
import type { ApplicationStage } from '../../constants/applicationStages';
import { isInterviewing, latestPayChange, openOffers, pipeline, raisesFrom } from './commandCenter';
import type { RaiseSource } from './commandCenter';
import {
  FOLLOW_UP_AFTER_DAYS,
  appliedThisWeek,
  movedThisWeek,
  goneCold,
  needsFollowUp,
  nextWeekFocus,
  responseRate,
  weekHeadline,
  weekWindow,
} from './weeklyReview';

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

const quietLabel = (days: number) => (days >= 30 ? '30d+' : `${days}d`);

// The configured stage list is the source of the label; titlecasing the key is only a fallback.
const stageLabel = (status: string, stages: ApplicationStage[]) =>
  findApplicationStatus(status, stages)?.label ??
  (status === 'UNKNOWN'
    ? 'No stage'
    : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '));

const WeekView = ({ events, applications, offers, stages: appStages, todayIso }: ViewData) => {
  const window = useMemo(() => weekWindow(todayIso), [todayIso]);
  const applied = useMemo(() => appliedThisWeek(applications, todayIso), [applications, todayIso]);
  const moved = useMemo(() => movedThisWeek(applications, todayIso), [applications, todayIso]);
  const rate = useMemo(() => responseRate(applications), [applications]);
  const chase = useMemo(() => needsFollowUp(applications, todayIso), [applications, todayIso]);
  const cold = useMemo(() => goneCold(applications, todayIso), [applications, todayIso]);
  const focus = useMemo(() => nextWeekFocus(events, offers, todayIso), [events, offers, todayIso]);
  const stages = useMemo(() => pipeline(applications), [applications]);
  const live = useMemo(() => openOffers(offers, todayIso), [offers, todayIso]);
  const payChange = useMemo(
    () => latestPayChange(raisesFrom(offers as RaiseSource[]), todayIso),
    [offers, todayIso]
  );
  const inPlay = stages.reduce((total, stage) => total + stage.count, 0);
  const interviewing = stages
    .filter((stage) => isInterviewing(stage.status))
    .reduce((total, stage) => total + stage.count, 0);

  const headline = weekHeadline({
    applied: applied.length,
    moved: moved.length,
    rate,
    followUps: chase.length,
  });

  const stats: Stat[] = [
    {
      label: 'Sent',
      value: applied.length,
      hint: 'applications this week',
      to: '/applications',
    },
    {
      label: 'Moved on',
      value: moved.length,
      hint: 'past the Applied stage',
      to: '/applications',
      tone: moved.length ? 'good' : 'neutral',
    },
    {
      label: 'Response rate',
      value: rate.sent ? percent(rate.rate) : '—',
      hint: rate.sent ? `${rate.answered} of ${rate.sent} answered` : 'nothing sent yet',
      to: '/analytics',
      tone: rate.rate >= 0.2 ? 'good' : 'neutral',
    },
    {
      label: 'To chase',
      value: chase.length,
      hint: `quiet ${FOLLOW_UP_AFTER_DAYS}+ days`,
      tone: chase.length ? 'warn' : 'neutral',
    },
  ];

  // The standing picture, as opposed to what changed this week.
  const standing: Stat[] = [
    { label: 'In play', value: inPlay, hint: 'open applications', to: '/applications' },

    {
      label: 'Interviewing',
      value: interviewing,
      hint: interviewing ? 'in an interview round' : 'none yet',
      to: '/applications',
      tone: interviewing ? 'good' : 'neutral',
    },
    {
      label: 'Live offers',
      value: live.length,
      hint: live.length ? 'on the table' : 'none yet',
      to: '/offers',
      tone: live.length ? 'good' : 'neutral',
    },
    {
      label: 'Gone cold',
      value: cold.length,
      hint: `sent, never answered, quiet ${FOLLOW_UP_AFTER_DAYS}+ days`,
      to: '/applications',
    },
  ];

  const chaseCard = chase.length ? (
    <SummaryCard
      title="Worth a follow-up"
      icon={MessageOutlined}
      count={chase.length}
      tone="urgent"
      seeAll={{ to: '/applications', label: 'All applications' }}
      rows={chase.slice(0, 8).map(
        ({ application, daysQuiet }): SummaryRow => ({
          id: `chase-${application.id}`,
          to: `/applications?open=${application.id}`,
          title: `${application.company_details?.name ?? 'Unknown company'} · ${application.role_title}`,
          meta: `Last touched ${dayjs(application.updated_at).format('D MMM')}`,
          trailing: (
            <span className="text-[11px] font-semibold tabular-nums text-amber-600 dark:text-amber-300">
              {quietLabel(daysQuiet)} quiet
            </span>
          ),
        })
      )}
      footnote={`Replied to you, then went quiet for ${FOLLOW_UP_AFTER_DAYS} days or more. ${cold.length} more were never answered.`}
    />
  ) : null;

  const focusCard = focus.length ? (
    <SummaryCard
      title="Next seven days"
      icon={AimOutlined}
      count={focus.length}
      seeAll={{ to: '/events', label: 'All events' }}
      rows={focus.map(
        (item): SummaryRow => ({
          id: item.id,
          to: item.to,
          title: item.title,
          meta: item.detail,
          leading:
            item.kind === 'offer' ? (
              <DollarOutlined className="text-[12px] text-amber-500" />
            ) : (
              <CalendarOutlined className="text-[12px] text-blue-500" />
            ),
          trailing: (
            <span className="text-[11px] text-slate-400 dark:text-ink-500">
              {dayjs(item.date).format('ddd D MMM')}
            </span>
          ),
        })
      )}
    />
  ) : null;

  const sentCard = applied.length ? (
    <SummaryCard
      title="Sent this week"
      icon={SendOutlined}
      count={applied.length}
      seeAll={{ to: '/applications', label: 'All applications' }}
      rows={applied.slice(0, 8).map(
        (application): SummaryRow => ({
          id: `sent-${application.id}`,
          to: `/applications?open=${application.id}`,
          title: `${application.company_details?.name ?? 'Unknown company'} · ${application.role_title}`,
          meta: application.date_applied
            ? dayjs(application.date_applied).format('ddd D MMM')
            : 'No date recorded',
        })
      )}
    />
  ) : null;

  const movedCard = moved.length ? (
    <SummaryCard
      title="Moved forward"
      icon={AimOutlined}
      count={moved.length}
      seeAll={{ to: '/applications', label: 'All applications' }}
      rows={moved.slice(0, 8).map(
        (application): SummaryRow => ({
          id: `moved-${application.id}`,
          to: `/applications?open=${application.id}`,
          title: `${application.company_details?.name ?? 'Unknown company'} · ${application.role_title}`,
          meta: `Updated ${dayjs(application.updated_at).format('ddd D MMM')}`,
          trailing: (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
              {application.status?.toLowerCase().replace(/_/g, ' ')}
            </span>
          ),
        })
      )}
    />
  ) : null;

  const pipelineCard = stages.length ? (
    <SummaryCard
      title="Live pipeline"
      icon={SolutionOutlined}
      collapsible
      count={inPlay}
      seeAll={{ to: '/applications', label: 'All applications' }}
      rows={stages.map(
        (stage): SummaryRow => ({
          id: `stage-${stage.status}`,
          to: `/applications?status=${encodeURIComponent(stage.status)}`,
          title: stageLabel(stage.status, appStages),
          trailing: (
            <span className="inline-flex min-w-6 justify-end text-[13px] font-semibold tabular-nums text-slate-700 dark:text-ink-100">
              {stage.count}
            </span>
          ),
        })
      )}
    />
  ) : null;

  const main = [chaseCard, sentCard, movedCard].filter(Boolean);
  const rail = [
    focusCard,
    pipelineCard,
    payChange ? <PayChangeCard raise={payChange} /> : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <section className="enterprise-card relative overflow-hidden p-5">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 to-fuchsia-500"
        />
        <div className="pl-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-violet-600 dark:text-violet-300">
            Week of {dayjs(window.start).format('D MMM')} – {dayjs(window.end).format('D MMM YYYY')}
          </p>
          <p className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-ink-50">
            {headline}
          </p>
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-ink-400">
            {rate.sent
              ? `Across the whole search, ${rate.answered} of ${rate.sent} applications have come back to you.`
              : 'Log an application and this review starts tracking your response rate.'}
          </p>
        </div>
      </section>

      <StatStrip caption="This week" stats={stats} />
      <StatStrip caption="Where things stand" stats={standing} />

      {(main.length > 0 || rail.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-12">
          {main.length > 0 && (
            <div className="space-y-5 lg:col-span-7">
              {main.map((card, index) => (
                <div key={index}>{card}</div>
              ))}
            </div>
          )}
          {rail.length > 0 && (
            <div className={`space-y-5 ${main.length ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
              {rail.map((card, index) => (
                <div key={index}>{card}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {main.length === 0 && rail.length === 0 && (
        <section className="enterprise-card p-10 text-center">
          <p className="text-[13px] text-slate-500 dark:text-ink-400">
            No activity to review yet this week.{' '}
            <Link to="/applications" className="font-semibold text-blue-600 dark:text-blue-300">
              Log an application
            </Link>{' '}
            and next week&rsquo;s summary will have something to say.
          </p>
        </section>
      )}
    </div>
  );
};

export default WeekView;
