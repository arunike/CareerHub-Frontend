// MobileModal's confirm, not antd's: it centres the dialog, which bare antd does not.
import Modal from '../../components/modals/MobileModal';
import type { MessageInstance } from 'antd/es/message/interface';
import { createEvent, setRecurrence, updateEvent, updateRecurringSeries } from '../../api';
import { eventPayload } from '../../utils/Events/eventFormTypes';
import type { ApiError, EventFormValues } from '../../utils/Events/eventFormTypes';
import type { SpanEditScope } from '../../components/CalendarView/SpanDateFields';
import type { Event, RecurrenceRule } from '../../types';

interface EventSaveInput {
  events: Event[];
  editingId: number | null;
  recurrenceRule: RecurrenceRule | null;
  messageApi: MessageInstance;
  // Closes the form and refetches; each page words that differently.
  onSaved: () => void;
  // The span hook, which claims the save when one day of a run is being edited.
  saveWithScope: (input: { scope?: SpanEditScope; payload: Partial<Event> }) => Promise<boolean>;
}

// The create/update/conflict path two pages held byte for byte.
export const useEventSave = ({
  events,
  editingId,
  recurrenceRule,
  messageApi,
  onSaved,
  saveWithScope,
}: EventSaveInput) => {
  const submit = async (values: EventFormValues) => {
    const payload = eventPayload(values, recurrenceRule);
    if (await saveWithScope({ scope: values.scope as SpanEditScope | undefined, payload })) return;

    const saveEvent = async (force = false) => {
      if (!editingId) {
        const response = await createEvent(payload, force ? { force: true } : undefined);
        if (recurrenceRule && response.data.id) {
          await setRecurrence(response.data.id, recurrenceRule);
        }
        return;
      }

      const existing = events.find((event) => event.id === editingId);
      if (existing?.is_virtual && existing.parent_event) {
        await updateRecurringSeries(existing.parent_event, payload);
        if (recurrenceRule) await setRecurrence(existing.parent_event, recurrenceRule);
        return;
      }

      await updateEvent(editingId, payload, force ? { force: true } : undefined);
    };

    const announce = () => {
      messageApi.success(editingId ? 'Event updated' : 'Event created');
      onSaved();
    };

    try {
      await saveEvent();
      announce();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 400 && apiError.response?.data?.conflict) {
        Modal.confirm({
          title: 'Schedule Conflict',
          content: 'Conflict detected. Force save?',
          onOk: async () => {
            await saveEvent(true);
            announce();
          },
        });
        return;
      }
      messageApi.error('Failed to save event');
    }
  };

  return { submit };
};
