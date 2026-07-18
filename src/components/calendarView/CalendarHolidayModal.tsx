import { useEffect } from 'react';
import { format } from 'date-fns';
import { Button, Checkbox, Form, Input, Select } from 'antd';
import ModalShell from '../ModalShell';
import type { Holiday, HolidayTab } from '../../types';
import type { CalendarHolidayTarget } from './types';

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
}: CalendarHolidayModalProps) => {
  const [form] = Form.useForm<CalendarHolidayFormValues>();

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      description: mode === 'edit' ? holiday?.description : '',
      is_recurring: mode === 'edit' ? !!holiday?.is_recurring : false,
      tab: mode === 'edit' ? holiday?.tab || '' : target?.tab || '',
    });
  }, [form, holiday, mode, open, target]);

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
