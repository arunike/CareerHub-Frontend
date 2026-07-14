import { useEffect } from 'react';
import { format } from 'date-fns';
import { Button, Checkbox, Form, Input, Modal, Select } from 'antd';
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
    <Modal title={title} open={open} onCancel={onCancel} footer={null} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="description" label="Holiday Name">
          <Input placeholder={target?.label || holiday?.description || 'Custom Holiday'} />
        </Form.Item>
        <Form.Item name="tab" label="Holiday Tab">
          <Select
            options={[
              { label: 'My Holiday', value: '' },
              ...holidayTabs.map((tab) => ({ label: tab.name, value: tab.id })),
            ]}
          />
        </Form.Item>
        <Form.Item name="is_recurring" valuePropName="checked">
          <Checkbox>Recurring yearly</Checkbox>
        </Form.Item>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            Save
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CalendarHolidayModal;
