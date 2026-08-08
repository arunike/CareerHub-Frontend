import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Spin, message } from 'antd';
import dayjs from 'dayjs';
import Modal from '../../../components/MobileModal';
import {
  applyEventLinks,
  getEventLinkSuggestions,
  type EventLinkSuggestion,
} from '../../../api/availability';
import { getApiErrorMessage } from '../../../utils/apiError';

const CONFIDENCE_STYLE: Record<EventLinkSuggestion['confidence'], string> = {
  high: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const CONFIDENCE_NOTE: Record<EventLinkSuggestion['confidence'], string> = {
  high: 'Only one application at this company',
  medium: 'Several applications here — worth a glance',
  low: 'Short company name and several applications — check this one',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onLinked: () => void;
}

const LinkInterviewsModal = ({ open, onClose, onLinked }: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<EventLinkSuggestion[]>([]);
  const [unlinkedTotal, setUnlinkedTotal] = useState(0);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEventLinkSuggestions();
      setSuggestions(response.data.suggestions);
      setUnlinkedTotal(response.data.unlinked_total);
      setSkipped(new Set());
    } catch (error) {
      console.error('Failed to load link suggestions', error);
      message.error(getApiErrorMessage(error, 'Could not load suggestions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const accepted = useMemo(
    () => suggestions.filter((row) => !skipped.has(row.event)),
    [suggestions, skipped]
  );

  const apply = async (rows: EventLinkSuggestion[]) => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const response = await applyEventLinks(
        rows.map((row) => ({ event: row.event, application: row.application }))
      );
      message.success(
        `Linked ${response.data.linked} ${response.data.linked === 1 ? 'interview' : 'interviews'}`
      );
      onLinked();
      onClose();
    } catch (error) {
      console.error('Failed to apply links', error);
      message.error(getApiErrorMessage(error, 'Could not link those interviews'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      title="Link interviews to applications"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-400">
            {accepted.length} of {suggestions.length} selected
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              disabled={accepted.length === 0}
              onClick={() => void apply(accepted)}
            >
              Link {accepted.length}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-10 text-center">
          <Spin />
        </div>
      ) : suggestions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Nothing to suggest. {unlinkedTotal} unlinked{' '}
          {unlinkedTotal === 1 ? 'event has' : 'events have'} no matching application — link those
          from the event itself.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs leading-5 text-slate-500">
            Matched by company name in the event title. {unlinkedTotal - suggestions.length} other
            unlinked {unlinkedTotal - suggestions.length === 1 ? 'event' : 'events'} had no matching
            application and {unlinkedTotal - suggestions.length === 1 ? 'is' : 'are'} left alone.
          </p>
          <ul className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
            {suggestions.map((row) => {
              const isSkipped = skipped.has(row.event);
              return (
                <li
                  key={row.event}
                  className={`rounded-lg border px-3 py-2.5 transition ${
                    isSkipped ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {row.event_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {row.event_date && `${dayjs(row.event_date).format('MMM D, YYYY')} · `}
                        {row.company_name} · {row.role_title}
                        <span className="text-slate-400"> ({row.application_status})</span>
                      </p>
                      <span
                        title={CONFIDENCE_NOTE[row.confidence]}
                        className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CONFIDENCE_STYLE[row.confidence]}`}
                      >
                        {row.confidence}
                        {row.other_applications > 0 && ` · ${row.other_applications} other`}
                      </span>
                    </div>
                    <Button
                      size="small"
                      type="text"
                      className="shrink-0 !text-xs"
                      onClick={() =>
                        setSkipped((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.event)) next.delete(row.event);
                          else next.add(row.event);
                          return next;
                        })
                      }
                    >
                      {isSkipped ? 'Include' : 'Skip'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
};

export default LinkInterviewsModal;
