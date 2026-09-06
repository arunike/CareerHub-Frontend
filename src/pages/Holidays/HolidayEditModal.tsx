import type React from 'react';
import { Form, Input, Checkbox, Select, type FormInstance } from 'antd';
import Modal from '../../components/MobileModal';
import type { Holiday, HolidayTab } from '../../types';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

type Props = {
  editForm: FormInstance;
  customTabs: HolidayTab[];
  editModalOpen: boolean;
  editingItem: any;
  handleEditSubmit: () => void;
  holidays: Holiday[];
  setEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const HolidayEditModal = ({
  editForm,
  customTabs,
  editModalOpen,
  editingItem,
  handleEditSubmit,
  setEditModalOpen,
}: Props) => (
  <Modal
    title={
      editingItem?.isGroup
        ? 'Edit Time Off Collection'
        : editingItem?.isBulk
          ? `Edit ${editingItem.items.length} Holidays`
          : 'Edit Time Off'
    }
    open={editModalOpen}
    onCancel={() => setEditModalOpen(false)}
    onOk={handleEditSubmit}
    okText="Save"
  >
    <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={editForm} layout="vertical">
      {editingItem?.isBulk && !editingItem?.allSameDesc && (
        <div className="mb-4 text-gray-500 dark:text-ink-400 text-sm italic">
          You are editing multiple holidays with different names. Leave the name field blank to keep
          their original names, or type a new name to overwrite all of them.
        </div>
      )}
      <Form.Item
        name="description"
        label="Name"
        rules={
          editingItem?.isBulk && !editingItem?.allSameDesc
            ? []
            : [{ required: true, message: 'Please enter a name' }]
        }
      >
        <Input
          placeholder={
            editingItem?.isBulk && !editingItem?.allSameDesc
              ? 'Leave blank to keep original names...'
              : 'Winter Break'
          }
        />
      </Form.Item>
      <Form.Item name="is_recurring" valuePropName="checked">
        <Checkbox>Recurring (Yearly)</Checkbox>
      </Form.Item>
      {customTabs.length > 0 && (
        <Form.Item name="tab" label="Tab">
          <Select>
            {editingItem?.isBulk && (
              <Select.Option value="__unchanged__">
                <span className="text-gray-400 dark:text-ink-500 italic">Leave unchanged</span>
              </Select.Option>
            )}
            <Select.Option value="">My Time Off (default)</Select.Option>
            {customTabs.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}
    </Form>
  </Modal>
);

export default HolidayEditModal;
