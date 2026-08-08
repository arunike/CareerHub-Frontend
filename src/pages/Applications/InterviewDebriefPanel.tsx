import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Popconfirm, Rate, Select, Spin, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SolutionOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createInterviewDebrief,
  deleteInterviewDebrief,
  getInterviewDebriefs,
  updateInterviewDebrief,
} from '../../api/career';
import type { Event, InterviewDebrief } from '../../types';
import { getEvents } from '../../api/availability';
import { getApiErrorMessage } from '../../utils/apiError';

const { TextArea } = Input;

const FIELD_LABEL =
  'mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400';

interface Draft {
  stage: string;
  interview_date: string | null;
  questions_asked: string;
  went_well: string;
  weak_areas: string;
  interviewer_notes: string;
  confidence: number;
  next_steps: string;
}

const emptyDraft = (stage: string): Draft => ({
  stage,
  interview_date: dayjs().format('YYYY-MM-DD'),
  questions_asked: '',
  went_well: '',
  weak_areas: '',
  interviewer_notes: '',
  confidence: 0,
  next_steps: '',
});

// Terminal states are outcomes, not interviews, so they are not offered as rounds.
const NON_ROUND_STAGES = new Set([
  'APPLIED',
  'REJECTED',
  'GHOSTED',
  'REMOVED_FROM_SHEET',
  'OFFER_REJECTED',
]);

interface Props {
  applicationId: number;
  appStages: Array<{ key: string; label: string }>;
}

const InterviewDebriefPanel = ({ applicationId, appStages }: Props) => {
  // Linked calendar events are what tell us an interview actually happened.
  const [interviews, setInterviews] = useState<Event[]>([]);
  const [debriefs, setDebriefs] = useState<InterviewDebrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(''));

  const roundOptions = useMemo(
    () => appStages.filter((stage) => !NON_ROUND_STAGES.has(stage.key)),
    [appStages]
  );

  const labelFor = useCallback(
    (key: string) => appStages.find((stage) => stage.key === key)?.label ?? key,
    [appStages]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getInterviewDebriefs(applicationId);
      const payload = response.data;
      setDebriefs(Array.isArray(payload) ? payload : (payload?.results ?? []));
    } catch (error) {
      console.error('Failed to load debriefs', error);
      message.error('Could not load debriefs');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    void getEvents({ application: applicationId, include_instances: false })
      .then((response) => {
        if (!active) return;
        const payload = response.data;
        const list: Event[] = Array.isArray(payload) ? payload : (payload?.results ?? []);
        setInterviews([...list].sort((a, b) => a.date.localeCompare(b.date)));
      })
      .catch((error) => console.error('Failed to load linked interviews', error));
    return () => {
      active = false;
    };
  }, [applicationId]);

  const today = dayjs().format('YYYY-MM-DD');
  const upcoming = interviews.filter((event) => event.date >= today);
  // A past interview with nothing written is the whole reason debriefs stay empty.
  const awaitingDebrief = interviews.filter(
    (event) => event.date < today && !debriefs.some((entry) => entry.interview_date === event.date)
  );

  const startDebriefFor = (event: Event) => {
    setEditingId('new');
    setDraft({ ...emptyDraft(nextUndone), interview_date: event.date });
  };

  // Default to the first round that has no debrief yet.
  const nextUndone = useMemo(() => {
    const used = new Set(debriefs.map((d) => d.stage));
    return roundOptions.find((stage) => !used.has(stage.key))?.key ?? roundOptions[0]?.key ?? '';
  }, [debriefs, roundOptions]);

  const startAdd = () => {
    setEditingId('new');
    setDraft(emptyDraft(nextUndone));
  };

  const startEdit = (debrief: InterviewDebrief) => {
    setEditingId(debrief.id);
    setDraft({
      stage: debrief.stage,
      interview_date: debrief.interview_date ?? null,
      questions_asked: debrief.questions_asked ?? '',
      went_well: debrief.went_well ?? '',
      weak_areas: debrief.weak_areas ?? '',
      interviewer_notes: debrief.interviewer_notes ?? '',
      confidence: debrief.confidence ?? 0,
      next_steps: debrief.next_steps ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft(''));
  };

  const save = async () => {
    if (!draft.stage) {
      message.warning('Pick which round this was');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        // The API treats 0 as "not rated"; it only accepts 1-5 or null.
        confidence: draft.confidence > 0 ? draft.confidence : null,
      };
      if (editingId === 'new') {
        await createInterviewDebrief({ application: applicationId, ...payload });
      } else if (typeof editingId === 'number') {
        await updateInterviewDebrief(editingId, payload);
      }
      cancelEdit();
      await load();
    } catch (error) {
      console.error('Failed to save debrief', error);
      message.error(getApiErrorMessage(error, 'Could not save the debrief'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (debrief: InterviewDebrief) => {
    try {
      await deleteInterviewDebrief(debrief.id);
      await load();
    } catch (error) {
      console.error('Failed to delete debrief', error);
      message.error('Could not delete the debrief');
    }
  };

  const patch = (next: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...next }));

  const editor = (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={FIELD_LABEL}>Round</label>
          <Select
            className="w-full"
            value={draft.stage || undefined}
            onChange={(value) => patch({ stage: value })}
            placeholder="Which round?"
            options={roundOptions.map((stage) => ({ value: stage.key, label: stage.label }))}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Interview date</label>
          <DatePicker
            className="w-full"
            value={draft.interview_date ? dayjs(draft.interview_date) : null}
            onChange={(date) => patch({ interview_date: date ? date.format('YYYY-MM-DD') : null })}
          />
        </div>
      </div>

      {(
        [
          ['questions_asked', 'Questions asked', 'What did they ask?'],
          ['went_well', 'What went well', 'Answers you were happy with'],
          ['weak_areas', 'Weak areas', 'What to shore up before the next one'],
          ['interviewer_notes', 'Interviewer notes', 'Who you met, how they came across'],
          ['next_steps', 'Next steps', 'What they said happens next, and by when'],
        ] as const
      ).map(([key, label, placeholder]) => (
        <div key={key}>
          <label className={FIELD_LABEL}>{label}</label>
          <TextArea
            rows={2}
            value={draft[key]}
            onChange={(e) => patch({ [key]: e.target.value } as Partial<Draft>)}
            placeholder={placeholder}
            className="!rounded-lg"
          />
        </div>
      ))}

      <div>
        <label className={FIELD_LABEL}>Confidence</label>
        <Rate value={draft.confidence} onChange={(value) => patch({ confidence: value })} />
      </div>

      <div className="flex justify-end gap-2">
        <Button size="small" className="!rounded-lg !text-xs !font-semibold" onClick={cancelEdit}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          loading={saving}
          className="!rounded-lg !px-4 !text-xs !font-semibold"
          onClick={save}
        >
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Debriefs
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            One per round — what was asked, what to fix, what happens next.
          </p>
        </div>
        {editingId === null && roundOptions.length > 0 && (
          <Button
            size="small"
            icon={<PlusOutlined />}
            className="!rounded-lg !px-3 !text-xs !font-semibold"
            onClick={startAdd}
          >
            Debrief
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Prompted from the calendar: an interview that happened with nothing written. */}
          {editingId === null && awaitingDebrief.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">
                {awaitingDebrief.length === 1
                  ? 'An interview has passed without a debrief'
                  : `${awaitingDebrief.length} interviews have passed without a debrief`}
              </p>
              <ul className="mt-2 space-y-1.5">
                {awaitingDebrief.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-xs text-amber-900/80">
                      <span className="font-medium">{dayjs(event.date).format('MMM D')}</span>{' '}
                      <span className="truncate">{event.name}</span>
                    </span>
                    <Button
                      size="small"
                      type="primary"
                      className="!rounded-lg !text-xs"
                      onClick={() => startDebriefFor(event)}
                    >
                      Write debrief
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {editingId === null && upcoming.length > 0 && (
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Upcoming
              </p>
              <ul className="mt-1.5 space-y-1">
                {upcoming.map((event) => (
                  <li key={event.id} className="flex items-baseline gap-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">
                      {dayjs(event.date).format('MMM D')}
                    </span>
                    <span className="truncate">{event.name}</span>
                    {!event.is_all_day && (
                      <span className="shrink-0 text-slate-400">
                        {event.start_time.substring(0, 5)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {editingId === 'new' && editor}

          {debriefs.length === 0 && editingId === null && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <SolutionOutlined className="text-lg text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">
                No debriefs yet. Write one straight after an interview, while you still remember the
                questions.
              </p>
            </div>
          )}

          {debriefs.map((debrief) =>
            editingId === debrief.id ? (
              <div key={debrief.id}>{editor}</div>
            ) : (
              <div
                key={debrief.id}
                className="group rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {labelFor(debrief.stage)}
                      </span>
                      {debrief.interview_date && (
                        <span className="text-xs text-slate-400">
                          {dayjs(debrief.interview_date).format('MMM D, YYYY')}
                        </span>
                      )}
                      {debrief.confidence ? (
                        <Rate disabled value={debrief.confidence} className="!text-xs" />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      aria-label={`Edit ${labelFor(debrief.stage)} debrief`}
                      onClick={() => startEdit(debrief)}
                    />
                    <Popconfirm
                      title="Delete this debrief?"
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => remove(debrief)}
                    >
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                </div>

                <dl className="mt-2 space-y-1.5">
                  {(
                    [
                      ['questions_asked', 'Asked'],
                      ['went_well', 'Went well'],
                      ['weak_areas', 'Weak'],
                      ['interviewer_notes', 'Interviewers'],
                      ['next_steps', 'Next'],
                    ] as const
                  ).map(([key, label]) =>
                    debrief[key] ? (
                      <div key={key} className="flex gap-2 text-xs leading-relaxed">
                        <dt className="w-20 shrink-0 text-slate-400">{label}</dt>
                        <dd className="min-w-0 whitespace-pre-wrap text-slate-600">
                          {debrief[key]}
                        </dd>
                      </div>
                    ) : null
                  )}
                </dl>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewDebriefPanel;
