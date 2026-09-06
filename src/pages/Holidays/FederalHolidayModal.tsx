import type React from 'react';
import { Form, Input, DatePicker, Checkbox, type FormInstance } from 'antd';
import Modal from '../../components/MobileModal';
import SegmentedToggle from '../../components/SegmentedToggle';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

const { RangePicker } = DatePicker;

type Props = {
  federalForm: FormInstance;
  addFederalModalOpen: boolean;
  closeFederalModal: () => void;
  handleAddFederal: () => void;
  isFederalRangeMode: boolean;
  setIsFederalRangeMode: React.Dispatch<React.SetStateAction<boolean>>;
};

const FederalHolidayModal = ({
  federalForm,
  addFederalModalOpen,
  closeFederalModal,
  handleAddFederal,
  isFederalRangeMode,
  setIsFederalRangeMode,
}: Props) => (
  <Modal
    title="Add Observed Holiday"
    open={addFederalModalOpen}
    onCancel={closeFederalModal}
    onOk={handleAddFederal}
    okText={isFederalRangeMode ? 'Add Range' : 'Add time off'}
  >
    <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={federalForm} layout="vertical">
      <div className="mb-4 text-gray-500 dark:text-ink-400 text-sm">
        Add a company holiday, wellness day, or another shared day off as one date or a continuous
        range.
      </div>
      <div className="mb-5">
        <SegmentedToggle
          value={isFederalRangeMode ? 'range' : 'single'}
          onChange={(value) => {
            const nextIsRange = value === 'range';
            setIsFederalRangeMode(nextIsRange);
            federalForm.setFieldsValue(
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
      {isFederalRangeMode ? (
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

export default FederalHolidayModal;
