import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Skeleton } from 'antd';
import { getApplications, getEvents, getOffers, getTasks, getUserSettings } from '../../api';
import ModeToggle from '../../components/ModeToggle';
import { DEFAULT_APPLICATION_STAGES } from '../../constants/applicationStages';
import type { ApplicationStage } from '../../constants/applicationStages';
import TodayView from './TodayView';
import WeekView from './WeekView';
import type { CommandApplication, CommandEvent, CommandOffer, CommandTask } from './commandCenter';

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
  // Stage labels are user-configurable; the defaults are only a fallback.
  const [stages, setStages] = useState<ApplicationStage[]>(DEFAULT_APPLICATION_STAGES);
  // In the URL, so a reload or a shared link lands on the same view.
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'week' ? 'week' : 'today';

  const todayIso = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // One failing source should not blank the page; each card degrades on its own.
      const [eventRes, applicationRes, taskRes, offerRes, settingsRes] = await Promise.allSettled([
        getEvents({ start_date: todayIso, end_date: dayjs().add(90, 'day').format('YYYY-MM-DD') }),
        getApplications({ page_size: 200 }),
        getTasks(),
        getOffers(),
        getUserSettings(),
      ]);
      if (cancelled) return;
      if (eventRes.status === 'fulfilled') setEvents(list<CommandEvent>(eventRes.value.data));
      if (applicationRes.status === 'fulfilled')
        setApplications(list<CommandApplication>(applicationRes.value.data));
      if (taskRes.status === 'fulfilled') setTasks(list<CommandTask>(taskRes.value.data));
      if (offerRes.status === 'fulfilled') setOffers(list<CommandOffer>(offerRes.value.data));
      if (settingsRes.status === 'fulfilled') {
        const configured = settingsRes.value.data.application_stages;
        if (configured?.length) setStages(configured);
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [todayIso]);

  const data = { events, applications, tasks, offers, stages, todayIso };

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

      {loading ? (
        <div className="space-y-5">
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
