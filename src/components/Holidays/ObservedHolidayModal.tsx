import type React from 'react';
import { Form, Input, DatePicker, Checkbox, type FormInstance } from 'antd';
import Modal from '../modals/MobileModal';
import SegmentedToggle from '../inputs/SegmentedToggle';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

const { RangePicker } = DatePicker;

type Props = {
  observedForm: FormInstance;
  addObservedModalOpen: boolean;
  closeObservedModal: () => void;
  handleAddObserved: () => void;
  isObservedRangeMode: boolean;
  setIsObservedRangeMode: React.Dispatch<React.SetStateAction<boolean>>;
};

const ObservedHolidayModal = ({
  observedForm,
  addObservedModalOpen,
  closeObservedModal,
  handleAddObserved,
  isObservedRangeMode,
  setIsObservedRangeMode,
}: Props) => (
  <Modal
    title="Add Observed Holiday"
    open={addObservedModalOpen}
    onCancel={closeObservedModal}
    onOk={handleAddObserved}
    okText={isObservedRangeMode ? 'Add Range' : 'Add time off'}
  >
    <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={observedForm} layout="vertical">
      <div className="mb-4 text-gray-500 dark:text-ink-400 text-sm">
        Add a company holiday, wellness day, or another shared day off as one date or a continuous
        range.
      </div>
      <div className="mb-5">
        <SegmentedToggle
          value={isObservedRangeMode ? 'range' : 'single'}
          onChange={(value) => {
            const nextIsRange = value === 'range';
            setIsObservedRangeMode(nextIsRange);
            observedForm.setFieldsValue(
              nextIsRange ? { date: undefined } : { dateRange: undefined }
            );
          }}
          wrapperClassName="w-full rounded-xl bg-gray-100 dark:bg-ink-800 p-1"
          buttonClassName="flex-1 justify-center px-4 py-2.5"
          options={[
            { value: 'single', label: 'Single Day' },
            { value: 'range', label: 'Date Range' },
          ]}
        />
      </div>
      {isObservedRangeMode ? (
        <Form.Item
          name="dateRange"
          label="Date Range"
          rules={[{ required: true, message: 'Please select a date range' }]}
        >
          <RangePicker inputReadOnly className="w-full" />
        </Form.Item>
      ) : (
        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker inputReadOnly className="w-full" />
        </Form.Item>
      )}
      <Form.Item
        name="description"
        label="Name"
        rules={[{ required: true, message: 'Please enter a name' }]}
      >
        <Input placeholder="E.g., Company Founders Day" />
      </Form.Item>
      <Form.Item name="is_recurring" valuePropName="checked">
        <Checkbox>Recurring (Yearly)</Checkbox>
      </Form.Item>
    </Form>
  </Modal>
);

export default ObservedHolidayModal;
