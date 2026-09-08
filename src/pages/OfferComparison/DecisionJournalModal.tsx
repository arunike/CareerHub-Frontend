import { useCallback, useEffect, useState } from 'react';
import { Button, DatePicker, Input, Segmented, Tag, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ModalShell from '../../components/ModalShell';
import {
  createOfferDecisionJournal,
  getApplicationTimeline,
  getOfferDecisionJournal,
  updateOfferDecisionJournal,
} from '../../api';
import {
  decisionFromOffer,
  defaultDecidedOn,
  journalOutcome,
  reviewSchedule,
  type DecisionJournalEntry,
  type JournalDecision,
  type JournalReview,
  type TimelineDate,
} from './decisionJournal';
import type { OfferLike as Offer } from './calculations';

const VERDICTS: Array<{ value: NonNullable<JournalReview['verdict']>; label: string }> = [
  { value: 'HELD_UP', label: 'Held up' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'WRONG', label: 'Got it wrong' },
];

const list = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const results = (payload as { results?: unknown })?.results;
  return Array.isArray(results) ? (results as T[]) : [];
};

const DecisionJournalModal = ({
  offer,
  offerLabel,
  open,
  onClose,
}: {
  offer: Offer | null;
  offerLabel: string;
  open: boolean;
  onClose: () => void;
}) => {
  const [entry, setEntry] = useState<DecisionJournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const todayIso = dayjs().format('YYYY-MM-DD');

  const load = useCallback(async () => {
    if (!offer?.id) return;
    const [journalResponse, timelineResponse] = await Promise.all([
      getOfferDecisionJournal().catch(() => null),
      offer.application
        ? getApplicationTimeline(offer.application).catch(() => null)
        : Promise.resolve(null),
    ]);
    const found = list<DecisionJournalEntry>(journalResponse?.data).find(
      (item) => item.offer === offer.id
    );
    if (found) {
      setEntry(found);
      return;
    }
    const decision = decisionFromOffer(offer.final_decision_status);
    setEntry({
      offer: offer.id,
      decision,
      decided_on: defaultDecidedOn({
        decision,
        timeline: list<TimelineDate>(timelineResponse?.data),
        deadline: offer.deadline,
        todayIso,
      }),
      started_on: offer.linked_experience?.start_date ?? null,
      reasons: '',
      concerns: '',
      reviews: [],
    });
  }, [offer, todayIso]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const patch = (updates: Partial<DecisionJournalEntry>) =>
    setEntry((current) => (current ? { ...current, ...updates } : current));

  const save = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      // A declined offer has no start date, so nothing is carried over from the other tab.
      const payload = entry.decision === 'DECLINED' ? { ...entry, started_on: null } : { ...entry };
      const saved = entry.id
        ? await updateOfferDecisionJournal(entry.id, payload)
        : await createOfferDecisionJournal(payload);
      setEntry(saved.data as DecisionJournalEntry);
      message.success('Decision journal saved');
      onClose();
    } catch {
      message.error('Could not save the decision journal');
    } finally {
      setSaving(false);
    }
  };

  // Recording a review replaces that milestone rather than appending a second one for it.
  const recordReview = (milestone: number, updates: Partial<JournalReview>) =>
    setEntry((current) => {
      if (!current) return current;
      const reviews = current.reviews ?? [];
      const existing = reviews.find((review) => review.milestone === milestone);
      const next: JournalReview = { ...(existing ?? { milestone }), ...updates };
      return {
        ...current,
        reviews: existing
          ? reviews.map((review) => (review.milestone === milestone ? next : review))
          : [...reviews, next],
      };
    });

  if (!entry) return null;
  const schedule = reviewSchedule(entry, todayIso);
  const outcome = journalOutcome(entry, todayIso);
  const isDeclined = entry.decision === 'DECLINED';

  return (
    <ModalShell
      isOpen={open}
      onClose={onClose}
      title={`Decision journal — ${offerLabel}`}
      maxWidthClass="max-w-[680px]"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => void save()}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={entry.decision}
            onChange={(value) => patch({ decision: value as JournalDecision })}
            options={[
              { label: 'Accepted', value: 'ACCEPTED' },
              { label: 'Declined', value: 'DECLINED' },
            ]}
          />
          <Tag color={outcome.tone === 'good' ? 'green' : outcome.tone === 'bad' ? 'red' : 'blue'}>
            {outcome.label}
          </Tag>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-ink-400">
              Decided on
            </span>
            <DatePicker
              className="w-full"
              value={entry.decided_on ? dayjs(entry.decided_on) : null}
              onChange={(value) => patch({ decided_on: value?.format('YYYY-MM-DD') ?? todayIso })}
            />
            <span className="mt-1 block text-[11px] text-slate-400 dark:text-ink-500">
              Taken from this application's timeline where it records one.
            </span>
          </label>
          {!isDeclined && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-ink-400">
                Started on
              </span>
              <DatePicker
                className="w-full"
                value={entry.started_on ? dayjs(entry.started_on) : null}
                onChange={(value) => patch({ started_on: value?.format('YYYY-MM-DD') ?? null })}
              />
              <span className="mt-1 block text-[11px] text-slate-400 dark:text-ink-500">
                Look-backs count from here, or from the decision if it is blank.
              </span>
            </label>
          )}
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-ink-400">
            Why this was the right call
          </span>
          <Input.TextArea
            rows={3}
            value={entry.reasons ?? ''}
            onChange={(event) => patch({ reasons: event.target.value })}
            placeholder="What you were betting on"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-ink-400">
            What worried you
          </span>
          <Input.TextArea
            rows={2}
            value={entry.concerns ?? ''}
            onChange={(event) => patch({ concerns: event.target.value })}
            placeholder="The risks you accepted, so the look-back has something to check"
          />
        </label>

        <section>
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-ink-400">Look back</p>
          <div className="space-y-3">
            {schedule.map((slot) => {
              const locked = slot.status === 'upcoming';
              return (
                <div
                  key={slot.milestone}
                  className={`rounded-xl border p-4 ${
                    locked
                      ? 'border-dashed border-slate-200 bg-slate-50/50 dark:border-white/[0.08] dark:bg-ink-900/40'
                      : slot.status === 'done'
                        ? 'border-emerald-200/70 bg-emerald-50/30 dark:border-emerald-400/20 dark:bg-emerald-500/[0.06]'
                        : 'border-amber-200/80 bg-amber-50/40 dark:border-amber-400/20 dark:bg-amber-500/[0.07]'
                  }`}
                >
                  <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                          locked
                            ? 'bg-slate-200/70 text-slate-500 dark:bg-white/[0.06] dark:text-ink-400'
                            : 'bg-slate-900 text-white dark:bg-ink-50 dark:text-ink-950'
                        }`}
                      >
                        {slot.milestone}d
                      </span>
                      <span
                        className={`text-[13px] font-semibold ${
                          locked
                            ? 'text-slate-400 dark:text-ink-500'
                            : 'text-slate-800 dark:text-ink-100'
                        }`}
                      >
                        {dayjs(slot.dueOn).format('D MMM YYYY')}
                      </span>
                    </div>
                    {/* The verdict is already visible in the control below, so this says timing instead. */}
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                        slot.status === 'due'
                          ? 'text-amber-700 dark:text-amber-300'
                          : slot.status === 'done'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-400 dark:text-ink-500'
                      }`}
                    >
                      {locked && <LockOutlined className="text-[10px]" />}
                      {slot.status === 'due'
                        ? 'Ready to review'
                        : slot.status === 'done'
                          ? `Reviewed ${dayjs(slot.review?.completed_on).format('D MMM YYYY')}`
                          : `Opens in ${slot.daysAway} days`}
                    </span>
                  </header>

                  {/* Shown locked rather than hidden: the point is knowing the look-back is coming. */}
                  <div
                    className={`mt-3 space-y-2.5 ${locked ? 'pointer-events-none opacity-45' : ''}`}
                  >
                    <Segmented
                      size="small"
                      block
                      disabled={locked}
                      value={slot.review?.verdict ?? undefined}
                      onChange={(value) =>
                        recordReview(slot.milestone, {
                          verdict: value as JournalReview['verdict'],
                          completed_on: slot.review?.completed_on ?? todayIso,
                        })
                      }
                      options={VERDICTS}
                    />
                    <Input.TextArea
                      rows={3}
                      disabled={locked}
                      value={slot.review?.notes ?? ''}
                      onChange={(event) =>
                        recordReview(slot.milestone, {
                          notes: event.target.value,
                          completed_on: slot.review?.completed_on ?? todayIso,
                        })
                      }
                      placeholder={
                        locked
                          ? `Opens on ${dayjs(slot.dueOn).format('D MMM YYYY')}`
                          : 'What actually happened against what you expected'
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ModalShell>
  );
};

export default DecisionJournalModal;
