import dayjs from 'dayjs';
import type { Event } from '../../types';
import {
  confirmEventDeletion,
  type EventDeleteScope,
} from '../CalendarView/confirmCalendarDeletion';
import SpanDetailModal, { type SpanDetailField } from '../CalendarView/SpanDetailModal';
import { safeExternalHref } from '../../utils/safeUrl';

type EventViewModalProps = {
  event: Event | null;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDuplicate?: (event: Event) => void;
  onDelete?: (event: Event, scope: EventDeleteScope) => boolean | void | Promise<boolean | void>;
};

const timeLabel = (event: Event, isMultiDay: boolean) => {
  if (event.is_all_day) return 'All day';
  const start = event.start_time.substring(0, 5);
  const end = event.end_time.substring(0, 5);
  if (!isMultiDay) return `${start} - ${end}`;
  return `${start} on ${dayjs(event.date).format('MMM D')} – ${end} on ${dayjs(event.end_date).format('MMM D')}`;
};

const EventViewModal = ({ event, onClose, onEdit, onDuplicate, onDelete }: EventViewModalProps) => {
  const isMultiDay = Boolean(event?.end_date && event.end_date !== event.date);

  const fields: SpanDetailField[] = event
    ? [
        {
          label: isMultiDay ? 'Dates' : 'Date',
          value: `${dayjs(event.date).format('MMMM D, YYYY')}${
            isMultiDay ? ` – ${dayjs(event.end_date).format('MMMM D, YYYY')}` : ''
          }`,
        },
        { label: 'Time', value: timeLabel(event, isMultiDay) },
        ...(event.meeting_link
          ? [
              {
                label: 'Meeting',
                value: (
                  <a href={safeExternalHref(event.meeting_link)} target="_blank" rel="noreferrer">
                    {event.meeting_link}
                  </a>
                ),
                wide: true,
              },
            ]
          : []),
        ...(event.notes ? [{ label: 'Notes', value: event.notes, wide: true }] : []),
      ]
    : [];

  return (
    <SpanDetailModal
      open={Boolean(event)}
      title={event?.name}
      fields={fields}
      onClose={onClose}
      onEdit={
        event
          ? () => {
              onEdit(event);
              onClose();
            }
          : undefined
      }
      onDuplicate={
        onDuplicate && event && !event.is_locked
          ? () => {
              onDuplicate(event);
              onClose();
            }
          : undefined
      }
      onDelete={event && onDelete ? () => confirmEventDeletion(event, onDelete) : undefined}
      deleteDisabled={event?.is_locked}
      deleteTitle={event?.is_locked ? 'Unlock this event to delete it' : undefined}
    />
  );
};

export default EventViewModal;
