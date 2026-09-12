import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, Skeleton } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import {
  getApplications,
  getEvents,
  getOfferDecisionJournal,
  getOffers,
  getTasks,
  getUserSettings,
} from '../../api';
import ModeToggle from '../../components/ModeToggle';
import { DEFAULT_APPLICATION_STAGES } from '../../constants/applicationStages';
import type { ApplicationStage } from '../../constants/applicationStages';
import TodayView from './TodayView';
import WeekView from './WeekView';
import type { CommandApplication, CommandEvent, CommandOffer, CommandTask } from './commandCenter';
import type { DecisionJournalEntry } from '../OfferComparison/decisionJournal';
import { SOURCE_LABELS, unavailableMessage, type CommandSource } from './commandCenterSources';

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

export default function CommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CommandEvent[]>([]);
  const [applications, setApplications] = useState<CommandApplication[]>([]);
  const [tasks, setTasks] = useState<CommandTask[]>([]);
  const [offers, setOffers] = useState<CommandOffer[]>([]);
  const [journals, setJournals] = useState<DecisionJournalEntry[]>([]);
  // Stage labels are user-configurable; the defaults are only a fallback.
  const [stages, setStages] = useState<ApplicationStage[]>(DEFAULT_APPLICATION_STAGES);
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
        } else {
          const configured = (await getUserSettings()).data.application_stages;
          if (configured?.length) setStages(configured);
        }
        return true;
      } catch {
        return false;
      }
    },
    [todayIso]
  );

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

  const data = { events, applications, tasks, offers, journals, stages, todayIso, failed };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-[-0.025em] text-slate-900 dark:text-ink-50">
            Command Center
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
          <span className="sr-only">Loading your Command Center</span>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : view === 'today' ? (
        <TodayView {...data} />
      ) : (
        <WeekView {...data} />
      )}
    </div>
  );
}
