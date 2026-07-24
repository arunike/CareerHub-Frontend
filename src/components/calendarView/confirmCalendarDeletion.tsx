import { Button, Modal } from 'antd';
import type { Event, Holiday } from '../../types';

export type EventDeleteScope = 'instance' | 'series';

type EventDeleteHandler = (
  event: Event,
  scope: EventDeleteScope
) => boolean | void | Promise<boolean | void>;

type HolidayDeleteHandler = (holiday: Holiday) => boolean | void | Promise<boolean | void>;

export const confirmEventDeletion = (event: Event, onDelete: EventDeleteHandler) => {
  if (event.is_locked) return;

  if (event.is_virtual && event.parent_event) {
    let deleting = false;

    const deleteAndClose = async (scope: EventDeleteScope) => {
      if (deleting) return;
      deleting = true;
      try {
        const deleted = await onDelete(event, scope);
        if (deleted !== false) confirmation.destroy();
      } finally {
        deleting = false;
      }
    };

    const confirmation = Modal.confirm({
      title: 'Delete recurring event?',
      content: `Choose what to delete for “${event.name}”.`,
      icon: null,
      closable: true,
      footer: () => (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => confirmation.destroy()}>Cancel</Button>
          <Button danger onClick={() => void deleteAndClose('instance')}>
            This occurrence
          </Button>
          <Button danger type="primary" onClick={() => void deleteAndClose('series')}>
            Entire series
          </Button>
        </div>
      ),
    });
    return;
  }

  Modal.confirm({
    title: 'Delete event?',
    content: `Delete “${event.name}”? This cannot be undone.`,
    okText: 'Delete event',
    okType: 'danger',
    cancelText: 'Keep event',
    onOk: () => onDelete(event, 'series'),
  });
};

export const confirmHolidayDeletion = (holiday: Holiday, onDelete: HolidayDeleteHandler) => {
  if (holiday.is_locked || !holiday.id) return;

  Modal.confirm({
    title: 'Delete holiday?',
    content: `Delete “${holiday.description || 'this holiday'}”? This cannot be undone.`,
    okText: 'Delete holiday',
    okType: 'danger',
    cancelText: 'Keep holiday',
    onOk: () => onDelete(holiday),
  });
};
