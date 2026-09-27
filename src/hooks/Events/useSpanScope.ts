import { useState } from 'react';
import type { FormInstance } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import dayjs from 'dayjs';
import { createEvent, deleteEvent, updateEvent } from '../../api';
import { askOverrideOverwrite, isSpanEvent } from '../../components/CalendarView/confirmSpanEdit';
import type { SpanEditScope } from '../../components/CalendarView/SpanDateFields';
import { eventSpanDays } from '../../components/CalendarView/utils';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Event } from '../../types';

interface SpanScopeInput {
  events: Event[];
  editingId: number | null;
  form: FormInstance;
  messageApi: MessageInstance;
  // Closes the form and refetches; each page does this its own way.
  onSaved: () => void;
}

export interface SpanScopeApi {
  // Empty unless a span is being edited, which is what hides the scope control the rest of the time.
  spanEditDays: string[];
  beginSpanEdit: (event: Event, clickedDay?: string) => void;
  clearSpanScope: () => void;
  onScopeChange: (next: SpanEditScope) => void;
  // True when the scope decided the save, so the caller skips its own update.
  saveWithScope: (input: {
    scope?: SpanEditScope;
    payload: Record<string, unknown>;
  }) => Promise<boolean>;
}

export interface SpanSaveDecision {
  kind: 'day-override' | 'ask-before-replacing' | 'caller-saves';
}

// Which of the three paths a save takes, so the branch can be tested without a component.
export const spanSaveDecision = ({
  hasSpanScope,
  editingId,
  scope,
  overrideCount,
}: {
  hasSpanScope: boolean;
  editingId: number | null;
  scope?: SpanEditScope;
  overrideCount: number;
}): SpanSaveDecision => {
  if (!hasSpanScope || !editingId) return { kind: 'caller-saves' };
  if (scope && scope !== 'all') return { kind: 'day-override' };
  return { kind: overrideCount > 0 ? 'ask-before-replacing' : 'caller-saves' };
};

// One owner for "which days of a run am I editing", shared by every page that edits an event.
export const useSpanScope = ({
  events,
  editingId,
  form,
  messageApi,
  onSaved,
}: SpanScopeInput): SpanScopeApi => {
  const [spanScope, setSpanScope] = useState<{ scope: SpanEditScope; day: string } | null>(null);

  const editingSpan = spanScope ? (events.find((event) => event.id === editingId) ?? null) : null;
  const spanEditDays = editingSpan
    ? Array.from({ length: eventSpanDays(editingSpan) }, (_unused, offset) =>
        dayjs(editingSpan.date).add(offset, 'day').format('YYYY-MM-DD')
      )
    : [];

  const beginSpanEdit = (event: Event, clickedDay?: string) => {
    setSpanScope(isSpanEvent(event) ? { scope: 'all', day: clickedDay || event.date } : null);
  };

  const clearSpanScope = () => setSpanScope(null);

  const onScopeChange = (next: SpanEditScope) => {
    const event = events.find((candidate) => candidate.id === editingId);
    if (!event || !spanScope) return;
    setSpanScope({ ...spanScope, scope: next, day: next === 'all' ? spanScope.day : next });
    form.setFieldsValue({
      date: dayjs(next === 'all' ? event.date : next),
      end_date: next === 'all' && event.end_date ? dayjs(event.end_date) : null,
      is_multi_day: next === 'all',
    });
  };

  const saveWithScope = async ({
    scope,
    payload,
  }: {
    scope?: SpanEditScope;
    payload: Record<string, unknown>;
  }) => {
    if (!spanScope || editingId === null) return false;
    const overrides = events.filter((candidate) => candidate.span_parent === editingId);
    const decision = spanSaveDecision({
      hasSpanScope: true,
      editingId,
      scope,
      overrideCount: overrides.length,
    });
    if (decision.kind === 'caller-saves') {
      setSpanScope(null);
      return false;
    }

    // "This day only" saves an override attached to the span, leaving the run untouched.
    if (decision.kind === 'day-override') {
      const parent = events.find((candidate) => candidate.id === editingId);
      const existing = events.find(
        (candidate) =>
          candidate.span_parent === editingId && candidate.override_date === spanScope.day
      );
      const dayPayload = {
        ...payload,
        end_date: null,
        is_recurring: false,
        recurrence_rule: null,
        span_parent: parent?.span_parent ?? editingId,
        override_date: scope,
      };
      try {
        if (existing) await updateEvent(existing.id, dayPayload);
        else await createEvent(dayPayload);
        messageApi.success(`Updated ${dayjs(scope).format('MMM D')} only`);
        setSpanScope(null);
        onSaved();
      } catch (error) {
        messageApi.error(getApiErrorMessage(error, 'Could not save that day'));
      }
      return true;
    }

    // Editing the whole span would wipe any day already edited on its own, so ask first.
    askOverrideOverwrite(overrides.length, async (discard) => {
      try {
        if (discard) await Promise.all(overrides.map((override) => deleteEvent(override.id)));
        await updateEvent(editingId, payload);
        messageApi.success(discard ? 'Event updated; separate days replaced' : 'Event updated');
        setSpanScope(null);
        onSaved();
      } catch (error) {
        messageApi.error(getApiErrorMessage(error, 'Could not update the event'));
      }
    });
    return true;
  };

  return { spanEditDays, beginSpanEdit, clearSpanScope, onScopeChange, saveWithScope };
};
