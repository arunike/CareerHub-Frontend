import type { ReactNode } from 'react';
import { Checkbox, Col, DatePicker, Form, Row } from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import SegmentedToggle from '../inputs/SegmentedToggle';

// Either the whole run, or the one day of it being edited, named by its ISO date.
export type SpanEditScope = 'all' | string;

type SpanDateFieldsProps = {
  form: FormInstance;
  isMultiDay?: boolean;
  // One day out of a run is one day, so spanning from it is not offered.
  multiDayDisabled?: boolean;
  size?: 'large';
  dateRequiredMessage?: string;
  // Every day of the run being edited, so any of them can be picked without reopening.
  spanDays?: string[];
  onScopeChange?: (scope: SpanEditScope) => void;
  // Sits beside the start date, which is where the event form puts its timezone.
  aside?: ReactNode;
  // Checkboxes shown before Multi-day, such as All day or Recurring yearly.
  children?: ReactNode;
};

// A component rather than a bare div, because Form.Item clones its child with value and onChange.
const ScopeStrip = ({
  value,
  onChange,
  options,
}: {
  value?: SpanEditScope;
  onChange?: (next: SpanEditScope) => void;
  options: { value: SpanEditScope; label: string }[];
}) => (
  // Bleeding past the modal's own padding runs the track off the edge, which reads as more.
  <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
    <SegmentedToggle<SpanEditScope>
      value={value ?? 'all'}
      onChange={(next) => onChange?.(next)}
      options={options}
      // w-max keeps the track as wide as its chips, so it runs past the edge rather than squashing.
      wrapperClassName="w-max"
      buttonClassName="shrink-0"
    />
  </div>
);

// The one date section for anything that can span days, so events and time off cannot drift apart.
const SpanDateFields = ({
  form,
  isMultiDay,
  multiDayDisabled,
  size,
  dateRequiredMessage,
  spanDays = [],
  onScopeChange,
  aside,
  children,
}: SpanDateFieldsProps) => {
  const scope: SpanEditScope = Form.useWatch('scope', form) ?? 'all';
  const canChooseScope = spanDays.length > 1;

  const chooseScope = (next: SpanEditScope) => {
    form.setFieldValue('scope', next);
    onScopeChange?.(next);
  };

  const scopeOptions = [
    { value: 'all', label: `All ${spanDays.length} days` },
    ...spanDays.map((day) => ({ value: day, label: dayjs(day).format('MMM D') })),
  ];

  // The dates pair with each other, or with the aside, so the row never ends half empty.
  const dateSpan = 12;
  const asideSpan = isMultiDay ? 24 : 12;

  return (
    <>
      {canChooseScope && (
        <Form.Item name="scope" label="Editing" className="mb-4">
          <ScopeStrip value={scope} onChange={chooseScope} options={scopeOptions} />
        </Form.Item>
      )}

      {/* Above the dates, because these decide which date fields exist below them. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {children}
        <Form.Item name="is_multi_day" valuePropName="checked" noStyle>
          <Checkbox
            disabled={multiDayDisabled || (canChooseScope && scope !== 'all')}
            onChange={(changeEvent) => {
              // Seed the end date with the start so the picker opens somewhere sensible.
              if (changeEvent.target.checked && !form.getFieldValue('end_date')) {
                form.setFieldValue('end_date', form.getFieldValue('date'));
              }
            }}
          >
            Multi-day
          </Checkbox>
        </Form.Item>
      </div>

      <Row gutter={16}>
        <Col xs={24} sm={dateSpan}>
          <Form.Item
            name="date"
            label={isMultiDay ? 'Start Date' : 'Date'}
            rules={[{ required: true, message: dateRequiredMessage }]}
          >
            <DatePicker
              size={size}
              inputReadOnly
              style={{ width: '100%' }}
              onChange={(nextStart) => {
                // A start past the end drops the end rather than holding an impossible range.
                const end = form.getFieldValue('end_date');
                if (nextStart && end && end.isBefore(nextStart, 'day')) {
                  form.setFieldValue('end_date', null);
                  form.validateFields(['end_date']).catch(() => {});
                }
              }}
            />
          </Form.Item>
        </Col>

        {isMultiDay && (
          <Col xs={24} sm={dateSpan}>
            <Form.Item
              name="end_date"
              label="End Date"
              dependencies={['date']}
              rules={[
                { required: true, message: 'Pick the last day' },
                ({ getFieldValue }) => ({
                  validator: (_rule, value) => {
                    const start = getFieldValue('date');
                    if (!value || !start || !value.isBefore(start, 'day')) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('The end date cannot be before the start date')
                    );
                  },
                }),
              ]}
            >
              <DatePicker
                size={size}
                inputReadOnly
                style={{ width: '100%' }}
                disabledDate={(current) => {
                  const start = form.getFieldValue('date');
                  return Boolean(start && current && current.isBefore(start, 'day'));
                }}
                onChange={(nextEnd) => {
                  const start = form.getFieldValue('date');
                  if (nextEnd && start && nextEnd.isBefore(start, 'day')) {
                    form.setFieldValue('end_date', null);
                  }
                }}
              />
            </Form.Item>
          </Col>
        )}

        {aside ? (
          <Col xs={24} sm={asideSpan}>
            {aside}
          </Col>
        ) : null}
      </Row>
    </>
  );
};

export default SpanDateFields;
