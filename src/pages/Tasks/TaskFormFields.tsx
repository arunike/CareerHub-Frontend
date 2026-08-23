import type { FormInstance } from 'antd';
import { STATUS_META } from './taskMeta';
import { DatePicker, Form, Input, Select } from 'antd';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

type Props = {
  form: FormInstance;
  modalMode: 'create' | 'edit' | 'view';
};

const TaskFormFields = ({ modalMode, form }: Props) => (
  <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={form} layout="vertical">
    <Form.Item
      name="title"
      label="Title"
      rules={[{ required: true, message: 'Please enter a title' }]}
    >
      <Input
        size="large"
        placeholder="e.g. Follow up with recruiter"
        disabled={modalMode === 'view'}
      />
    </Form.Item>
    <Form.Item name="description" label="Description">
      <Input.TextArea rows={3} placeholder="Optional details" disabled={modalMode === 'view'} />
    </Form.Item>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
        <Select
          size="large"
          disabled={modalMode === 'view'}
          options={STATUS_META.map((status) => ({
            label: status.label,
            value: status.key,
          }))}
        />
      </Form.Item>
      <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
        <Select
          size="large"
          disabled={modalMode === 'view'}
          options={[
            { label: 'Low', value: 'LOW' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'High', value: 'HIGH' },
          ]}
        />
      </Form.Item>
    </div>
    <Form.Item name="due_date" label="Due Date">
      <DatePicker
        inputReadOnly
        size="large"
        style={{ width: '100%' }}
        disabled={modalMode === 'view'}
      />
    </Form.Item>
  </Form>
);

export default TaskFormFields;
