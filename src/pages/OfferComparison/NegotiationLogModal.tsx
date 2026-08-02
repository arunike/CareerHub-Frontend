import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, InputNumber, Popconfirm, Select, message } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import Modal from '../../components/MobileModal';
import type { OfferLike as Offer } from './calculations';
import {
  FINAL_DECISION_CLASSES,
  FINAL_DECISION_LABELS,
  FINAL_DECISION_OPTIONS,
  NEGOTIATION_OUTCOME_CLASSES,
  NEGOTIATION_OUTCOME_LABELS,
  getNegotiationLineItems,
  normalizeFinalDecisionStatus,
  normalizeNegotiationRounds,
  sortNegotiationRounds,
  type FinalDecisionStatus,
  type NegotiationOutcome,
  type NegotiationRound,
} from './offerLifecycle';

const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  offer: Offer;
  offerLabel: string;
  onSave: (updates: Partial<Offer>) => Promise<void>;
}

type Draft = Omit<NegotiationRound, 'id'>;

const emptyDraft = (): Draft => ({
  date: dayjs().format('YYYY-MM-DD'),
  outcome: 'pending',
  askedBase: null,
  askedBonus: null,
  askedEquity: null,
  askedSignOn: null,
  receivedBase: null,
  receivedBonus: null,
  receivedEquity: null,
  receivedSignOn: null,
  notes: '',
});

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const money = (value: number | null) =>
  value == null ? '—' : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const COMPONENT_FIELDS: { label: string; asked: keyof Draft; received: keyof Draft }[] = [
  { label: 'Base', asked: 'askedBase', received: 'receivedBase' },
  { label: 'Bonus', asked: 'askedBonus', received: 'receivedBonus' },
  { label: 'Equity', asked: 'askedEquity', received: 'receivedEquity' },
  { label: 'Sign-on', asked: 'askedSignOn', received: 'receivedSignOn' },
];

const NegotiationLogModal = ({ open, onClose, offer, offerLabel, onSave }: Props) => {
  const [rounds, setRounds] = useState<NegotiationRound[]>([]);
  const [decision, setDecision] = useState<FinalDecisionStatus>('PENDING');
  const [reasoning, setReasoning] = useState('');
  const [riskNotes, setRiskNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRounds(normalizeNegotiationRounds(offer.negotiation_rounds));
    setDecision(normalizeFinalDecisionStatus(offer.final_decision_status));
    setReasoning(offer.final_decision_reasoning || '');
    setRiskNotes(offer.risk_notes || '');
    setEditingId(null);
    setDraft(emptyDraft());
  }, [open, offer]);

  const ordered = useMemo(() => sortNegotiationRounds(rounds), [rounds]);

  // A record saved with a legacy status still needs a matching option, or the
  // Select would render the bare enum value.
  const decisionOptions = useMemo(() => {
    if (FINAL_DECISION_OPTIONS.some((option) => option.value === decision)) {
      return FINAL_DECISION_OPTIONS;
    }
    return [...FINAL_DECISION_OPTIONS, { value: decision, label: FINAL_DECISION_LABELS[decision] }];
  }, [decision]);

  const startAdd = () => {
    setEditingId('__new__');
    setDraft(emptyDraft());
  };

  const startEdit = (round: NegotiationRound) => {
    const { id: _id, ...rest } = round;
    void _id;
    setEditingId(round.id);
    setDraft({ ...emptyDraft(), ...rest });
  };

  const commitDraft = () => {
    if (editingId === '__new__') {
      setRounds((prev) => [...prev, { ...draft, id: newId() }]);
    } else if (editingId) {
      setRounds((prev) =>
        prev.map((round) => (round.id === editingId ? { ...draft, id: editingId } : round))
      );
    }
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const removeRound = (id: string) => setRounds((prev) => prev.filter((round) => round.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        negotiation_rounds: rounds,
        final_decision_status: decision,
        final_decision_reasoning: reasoning,
        risk_notes: riskNotes,
      });
      message.success('Negotiation log saved');
      onClose();
    } catch (error) {
      console.error('Failed to save negotiation log', error);
      message.error('Could not save the negotiation log');
    } finally {
      setSaving(false);
    }
  };

  const patchDraft = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={760}
      title={
        <div className="flex items-center gap-2">
          <ThunderboltOutlined className="text-indigo-500" />
          <span>
            Negotiation log
            <span className="ml-2 font-normal text-slate-500">{offerLabel}</span>
          </span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          Save
        </Button>,
      ]}
    >
      <div className="space-y-6 pt-1">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Rounds
            </div>
            {editingId === null && (
              <Button size="small" icon={<PlusOutlined />} onClick={startAdd}>
                Add round
              </Button>
            )}
          </div>

          {ordered.length === 0 && editingId === null && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-500">
              No rounds logged yet. Record what you asked for and what came back.
            </div>
          )}

          <ul className="space-y-2">
            {ordered.map((round) => {
              const items = getNegotiationLineItems(round);
              return (
                <li key={round.id} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-slate-900">
                          {dayjs(round.date).format('MMM D, YYYY')}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${NEGOTIATION_OUTCOME_CLASSES[round.outcome]}`}
                        >
                          {NEGOTIATION_OUTCOME_LABELS[round.outcome]}
                        </span>
                      </div>
                      {items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {items.map((item) => (
                            <div
                              key={item.label}
                              className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-slate-600"
                            >
                              <span className="w-14 shrink-0 text-slate-400">{item.label}</span>
                              <span>asked {money(item.asked)}</span>
                              <span className="text-slate-300">→</span>
                              <span className="font-medium text-slate-900">
                                got {money(item.received)}
                              </span>
                              {item.gap != null && item.gap !== 0 && (
                                <span
                                  className={item.gap > 0 ? 'text-emerald-600' : 'text-rose-600'}
                                >
                                  ({item.gap > 0 ? '+' : '−'}
                                  {Math.abs(item.gap).toLocaleString()})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {round.notes && (
                        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                          {round.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        aria-label="Edit round"
                        onClick={() => startEdit(round)}
                      />
                      <Popconfirm
                        title="Delete this round?"
                        onConfirm={() => removeRound(round.id)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label="Delete round"
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {editingId !== null && (
            <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 px-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Date
                  </label>
                  <DatePicker
                    className="w-full"
                    value={draft.date ? dayjs(draft.date) : null}
                    onChange={(date) =>
                      patchDraft({ date: (date ?? dayjs()).format('YYYY-MM-DD') })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Outcome
                  </label>
                  <Select
                    className="w-full"
                    value={draft.outcome}
                    onChange={(value: NegotiationOutcome) => patchDraft({ outcome: value })}
                    options={(Object.keys(NEGOTIATION_OUTCOME_LABELS) as NegotiationOutcome[]).map(
                      (value) => ({ value, label: NEGOTIATION_OUTCOME_LABELS[value] })
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[64px_1fr_1fr] items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                <span />
                <span>Asked</span>
                <span>Received</span>
              </div>
              {COMPONENT_FIELDS.map((field) => (
                <div key={field.label} className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
                  <span className="text-[12px] text-slate-600">{field.label}</span>
                  <InputNumber
                    className="w-full"
                    value={draft[field.asked] as number | null}
                    onChange={(value) => patchDraft({ [field.asked]: value } as Partial<Draft>)}
                    prefix="$"
                    controls={false}
                    placeholder="—"
                  />
                  <InputNumber
                    className="w-full"
                    value={draft[field.received] as number | null}
                    onChange={(value) => patchDraft({ [field.received]: value } as Partial<Draft>)}
                    prefix="$"
                    controls={false}
                    placeholder="—"
                  />
                </div>
              ))}

              <TextArea
                rows={2}
                value={draft.notes}
                onChange={(e) => patchDraft({ notes: e.target.value })}
                placeholder="What was said, who you spoke to, what to try next…"
              />

              <div className="flex justify-end gap-2">
                <Button size="small" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button size="small" type="primary" onClick={commitDraft}>
                  {editingId === '__new__' ? 'Add round' : 'Update round'}
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <WarningOutlined className="text-rose-500" />
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Risks &amp; watch-outs
            </div>
          </div>
          <TextArea
            rows={3}
            value={riskNotes}
            onChange={(e) => setRiskNotes(e.target.value)}
            placeholder="Illiquid equity, short runway, unclear scope…"
          />
          <p className="text-[11px] text-slate-400">
            The Negotiation Advisor writes its &ldquo;Watch Out For&rdquo; list here so it survives
            beyond this browser.
          </p>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Final decision
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={decision}
              onChange={setDecision}
              options={decisionOptions}
              className="min-w-[200px]"
            />
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${FINAL_DECISION_CLASSES[decision]}`}
            >
              {FINAL_DECISION_LABELS[decision]}
            </span>
          </div>
          <TextArea
            rows={3}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Why you chose this — worth reading back in two years."
          />
        </section>
      </div>
    </Modal>
  );
};

export default NegotiationLogModal;
