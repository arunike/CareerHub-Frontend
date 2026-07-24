import { useEffect } from 'react';
import { format } from 'date-fns';
import { Button, Checkbox, Form, Input, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import ModalShell from '../ModalShell';
import type { Holiday, HolidayTab } from '../../types';
import type { CalendarHolidayTarget } from './types';
import { confirmHolidayDeletion } from './confirmCalendarDeletion';

export type CalendarHolidayFormValues = {
  description?: string;
  is_recurring?: boolean;
  tab?: string | null;
};

type CalendarHolidayModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  date?: Date | null;
  target?: CalendarHolidayTarget | null;
  holiday?: Holiday | null;
  holidayTabs?: HolidayTab[];
  onCancel: () => void;
  onSubmit: (values: CalendarHolidayFormValues) => void;
  onDelete?: (holiday: Holiday) => boolean | void | Promise<boolean | void>;
};

const CalendarHolidayModal = ({
  open,
  mode,
  date,
  target,
  holiday,
  holidayTabs = [],
  onCancel,
  onSubmit,
  onDelete,
}: CalendarHolidayModalProps) => {
  const [form] = Form.useForm<CalendarHolidayFormValues>();

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      description: holiday?.description || '',
      is_recurring: !!holiday?.is_recurring,
      tab: holiday?.tab || target?.tab || '',
    });
  }, [form, holiday, open, target]);

  const title =
    mode === 'edit'
      ? 'Edit Holiday'
      : `Add ${target?.label || 'Holiday'}${date ? ` on ${format(date, 'MMMM d, yyyy')}` : ''}`;

  return (
    <ModalShell
      isOpen={open}
      title={title}
      onClose={onCancel}
      maxWidthClass="max-w-lg"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      footer={
        <>
          {mode === 'edit' && holiday?.id && onDelete ? (
            <Button
              danger
              size="large"
              icon={<DeleteOutlined />}
              disabled={holiday.is_locked}
              title={holiday.is_locked ? 'Unlock this holiday to delete it' : undefined}
              onClick={() => confirmHolidayDeletion(holiday, onDelete)}
              className="w-full sm:mr-auto sm:w-auto"
            >
              Delete holiday
            </Button>
          ) : null}
          <Button size="large" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            size="large"
            type="primary"
            onClick={() => form.submit()}
            className="w-full sm:w-auto"
          >
            Save holiday
          </Button>
        </>
      }
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="description" label="Holiday Name">
          <Input
            size="large"
            placeholder={target?.label || holiday?.description || 'Custom Holiday'}
          />
        </Form.Item>
        <Form.Item name="tab" label="Holiday Tab">
          <Select
            size="large"
            options={[
              { label: 'My Holiday', value: '' },
              ...holidayTabs.map((tab) => ({ label: tab.name, value: tab.id })),
            ]}
          />
        </Form.Item>
        <Form.Item name="is_recurring" valuePropName="checked">
          <Checkbox className="min-h-11">Recurring yearly</Checkbox>
        </Form.Item>
      </Form>
    </ModalShell>
  );
};

export default CalendarHolidayModal;
