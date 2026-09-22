import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, Skeleton } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import {
  getApplications,
  getApplicationTimeline,
  getInterviewDebriefs,
  getEvents,
  getOfferDecisionJournal,
  getOffers,
  getTasks,
  getUserSettings,
} from '../../api';
import ModeToggle from '../../components/inputs/ModeToggle';
import { DEFAULT_APPLICATION_STAGES } from '../../constants/applicationStages';
import type { ApplicationStage } from '../../constants/applicationStages';
import TodayView from '../../components/Overview/TodayView';
import WeekView from '../../components/Overview/WeekView';
import { nextEvent } from '../../utils/Overview/overview';
import type {
  CommandApplication,
  CommandEvent,
  CommandOffer,
  CommandTask,
} from '../../utils/Overview/overview';
import { prepFromDebriefs, type InterviewPrep } from '../../utils/Overview/interviewPrep';
import type { TimelineEntryLike } from '../../utils/Overview/stageVelocity';
import type { DecisionJournalEntry } from '../../utils/OfferComparison/decisionJournal';
import {
  SOURCE_LABELS,
  unavailableMessage,
  type CommandSource,
} from '../../utils/Overview/overviewSources';

const list = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const results = (payload as { results?: unknown })?.results;
  return Array.isArray(results) ? (results as T[]) : [];
};

type View = 'today' | 'week';

const VIEWS: { label: string; value: View }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
];

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CommandEvent[]>([]);
  const [applications, setApplications] = useState<CommandApplication[]>([]);
  const [tasks, setTasks] = useState<CommandTask[]>([]);
  const [offers, setOffers] = useState<CommandOffer[]>([]);
  const [journals, setJournals] = useState<DecisionJournalEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntryLike[]>([]);
  // Stage labels are user-configurable; the defaults are only a fallback.
  const [stages, setStages] = useState<ApplicationStage[]>(DEFAULT_APPLICATION_STAGES);
  const [ghostAfterDays, setGhostAfterDays] = useState<number | undefined>(undefined);
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  // In the URL, so a reload or a shared link lands on the same view.
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'week' ? 'week' : 'today';

  const todayIso = dayjs().format('YYYY-MM-DD');

  // Which reads came back empty because they failed, as opposed to having nothing to report.
  const [failed, setFailed] = useState<CommandSource[]>([]);
  const [retrying, setRetrying] = useState<CommandSource | null>(null);

  const loadSource = useCallback(
    async (source: CommandSource): Promise<boolean> => {
      try {
        if (source === 'events') {
          const response = await getEvents({
            start_date: todayIso,
            end_date: dayjs().add(90, 'day').format('YYYY-MM-DD'),
          });
          setEvents(list<CommandEvent>(response.data));
        } else if (source === 'applications') {
          const response = await getApplications({ page_size: 200 });
          setApplications(list<CommandApplication>(response.data));
        } else if (source === 'tasks') {
          setTasks(list<CommandTask>((await getTasks()).data));
        } else if (source === 'offers') {
          setOffers(list<CommandOffer>((await getOffers()).data));
        } else if (source === 'journals') {
          setJournals(list<DecisionJournalEntry>((await getOfferDecisionJournal()).data));
        } else if (source === 'timeline') {
          // No application filter: the medians are only meaningful across the whole history.
          setTimeline(list<TimelineEntryLike>((await getApplicationTimeline()).data));
        } else {
          const settings = (await getUserSettings()).data;
          if (settings.application_stages?.length) setStages(settings.application_stages);
          if (settings.ghosting_threshold_days) setGhostAfterDays(settings.ghosting_threshold_days);
        }
        return true;
      } catch {
        return false;
      }
    },
    [todayIso]
  );

  // Secondary and allowed to fail: a missing prep note is nothing to show, not a broken source.
  useEffect(() => {
    const applicationId = nextEvent(events, todayIso)?.applicationId;
    if (!applicationId) {
      setPrep(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await getInterviewDebriefs(applicationId);
        if (!cancelled) setPrep(prepFromDebriefs(list(response.data), todayIso));
      } catch {
        if (!cancelled) setPrep(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [events, todayIso]);

  const retry = useCallback(
    async (source: CommandSource) => {
      setRetrying(source);
      const ok = await loadSource(source);
      if (ok) setFailed((current) => current.filter((entry) => entry !== source));
      setRetrying(null);
    },
    [loadSource]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // One failing source must not blank the page, and must not read as an all-clear either.
      const sources = Object.keys(SOURCE_LABELS) as CommandSource[];
      const results = await Promise.all(sources.map((source) => loadSource(source)));
      if (cancelled) return;
      setFailed(sources.filter((_, index) => !results[index]));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadSource]);

  const data = {
    events,
    applications,
    tasks,
    offers,
    journals,
    timeline,
    stages,
    ghostAfterDays,
    todayIso,
    failed,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-[-0.025em] text-slate-900 dark:text-ink-50">
            Overview
          </h1>
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-ink-400">
            {view === 'today'
              ? `${dayjs().format('dddd, D MMMM YYYY')} · everything that needs you, in one place.`
              : 'How the search went this week, and what to line up next.'}
          </p>
        </div>
        <ModeToggle
          size="lg"
          options={VIEWS}
          value={view}
          onChange={(next) => {
            const updated = new URLSearchParams(params);
            if (next === 'today') updated.delete('view');
            else updated.set('view', next);
            setParams(updated, { replace: true });
          }}
        />
      </header>

      {failed.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-500/10">
          <p className="flex items-start gap-2 text-[12.5px] font-medium text-amber-900 dark:text-amber-200">
            <WarningOutlined className="mt-0.5 shrink-0" />
            {unavailableMessage(failed)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {failed.map((source) => (
              <Button
                key={source}
                size="small"
                icon={<ReloadOutlined />}
                loading={retrying === source}
                onClick={() => void retry(source)}
              >
                Retry {SOURCE_LABELS[source]}
              </Button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-5" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading your Overview</span>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : view === 'today' ? (
        <TodayView {...data} prep={prep} />
      ) : (
        <WeekView {...data} />
      )}
    </div>
  );
}
