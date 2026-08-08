import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Checkbox,
  Collapse,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
} from 'antd';
import Modal from '../../../components/MobileModal';
import ApplicationSelect from '../../../components/ApplicationSelect';
import { suggestEventLink, type EventLinkHint } from '../../../api/availability';
import { EnvironmentOutlined, PlusOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import type { EventCategory, RecurrenceRule } from '../../../types';
import CategoryBadge from '../../../components/CategoryBadge';
import FriendlyTimeInput from '../../../components/FriendlyTimeInput';
import { TIMEZONE_OPTIONS } from '../../../lib/timezones';
import IconPicker from '../../../components/IconPicker';
import { SCROLL_TO_FIRST_ERROR } from '../../../constants/formDefaults';

const { Text } = Typography;
const { TextArea } = Input;

const QUICK_DURATIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
];

type EventEditorModalProps = {
  open: boolean;
  editingId: number | null;
  form: FormInstance;
  onCancel: () => void;
  onFinish: (values: any) => void;
  defaultDuration: number;
  categories: EventCategory[];
  newCategoryName: string;
  onNewCategoryNameChange: (value: string) => void;
  newCategoryIcon: string;
  onNewCategoryIconChange: (value: string) => void;
  onCreateCategory: () => Promise<void>;
  locationType: 'in_person' | 'virtual' | 'hybrid';
  onLocationTypeChange: (value: 'in_person' | 'virtual' | 'hybrid') => void;
  recurrenceRule: RecurrenceRule | null;
  onOpenRecurrence: () => void;
  onClearRecurrence: () => void;
};

const EventEditorModal = ({
  open,
  editingId,
  form,
  onCancel,
  onFinish,
  defaultDuration,
  categories,
  newCategoryName,
  onNewCategoryNameChange,
  newCategoryIcon,
  onNewCategoryIconChange,
  onCreateCategory,
  locationType,
  onLocationTypeChange,
  recurrenceRule,
  onOpenRecurrence,
  onClearRecurrence,
}: EventEditorModalProps) => {
  const isAllDay = Form.useWatch('is_all_day', form);
  const isMultiDay = Form.useWatch('is_multi_day', form);
  const eventName = Form.useWatch('name', form);
  const linkedApplication = Form.useWatch('application', form);
  const eventDate = Form.useWatch('date', form);
  const [linkHint, setLinkHint] = useState<EventLinkHint | null>(null);

  // Offered, never applied automatically: a wrong silent link is worse than none.
  useEffect(() => {
    if (linkedApplication || !eventName || eventName.trim().length < 3) {
      setLinkHint(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void suggestEventLink(
        eventName,
        eventDate ? dayjs(eventDate).format('YYYY-MM-DD') : undefined
      )
        .then((response) => {
          if (active) setLinkHint(response.data.suggestion);
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [eventName, eventDate, linkedApplication]);

  return (
    <Modal
      title={editingId ? 'Edit Event' : 'Add Event'}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={600}
    >
      <Form
        scrollToFirstError={SCROLL_TO_FIRST_ERROR}
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item name="name" label="Event Name" rules={[{ required: true }]}>
          <Input placeholder="Team Sync" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
              <DatePicker inputReadOnly style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="timezone" label="Timezone">
              <Select showSearch optionFilterProp="label" options={TIMEZONE_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        {isMultiDay && (
          <Row gutter={16}>
            <Col xs={24} sm={12}>
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
                <DatePicker inputReadOnly style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Form.Item name="is_all_day" valuePropName="checked" noStyle>
            <Checkbox>All day</Checkbox>
          </Form.Item>
          <Form.Item name="is_multi_day" valuePropName="checked" noStyle>
            <Checkbox
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
          <Col xs={24} sm={12}>
            <Form.Item
              name="start_time"
              label={isMultiDay ? 'Start Time (first day)' : 'Start Time'}
              rules={[{ required: !isAllDay }]}
            >
              <FriendlyTimeInput
                disabled={isAllDay}
                minuteStep={5}
                onChange={(val) => {
                  if (val) {
                    const end = val.add(defaultDuration, 'minute');
                    form.setFieldValue('end_time', end);
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="end_time"
              label={isMultiDay ? 'End Time (last day)' : 'End Time'}
              rules={[{ required: !isAllDay }]}
            >
              <FriendlyTimeInput disabled={isAllDay} minuteStep={5} />
            </Form.Item>
          </Col>
        </Row>

        <div className={isMultiDay ? 'hidden' : '-mt-3 mb-5'}>
          <Text type="secondary" className="mb-2 block text-xs">
            Quick duration
          </Text>
          <Space size={[6, 6]} wrap>
            {QUICK_DURATIONS.map((duration) => (
              <Button
                key={duration.minutes}
                type="default"
                size="small"
                disabled={isAllDay}
                className="!min-h-11 !min-w-11 md:!min-h-0 md:!min-w-0"
                onClick={() => {
                  const startTime = form.getFieldValue('start_time');
                  if (startTime) {
                    form.setFieldValue('end_time', startTime.add(duration.minutes, 'minute'));
                  }
                }}
              >
                {duration.label}
              </Button>
            ))}
          </Space>
        </div>

        <Collapse
          ghost
          items={[
            {
              key: 'advanced',
              label: <Text type="secondary">Advanced Options (Category, Location, Linking)</Text>,
              forceRender: true,
              children: (
                <>
                  <Form.Item name="category" label="Category">
                    <Select
                      options={categories.map((c) => ({
                        label: <CategoryBadge category={c} size="sm" />,
                        value: c.id,
                      }))}
                      placeholder="Select Category"
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Space style={{ padding: '0 8px 4px' }}>
                            <Input
                              placeholder="New Category"
                              value={newCategoryName}
                              onChange={(e) => onNewCategoryNameChange(e.target.value)}
                              style={{ width: 120 }}
                            />
                            <IconPicker
                              value={newCategoryIcon}
                              onChange={onNewCategoryIconChange}
                            />
                            <Button type="text" icon={<PlusOutlined />} onClick={onCreateCategory}>
                              Add
                            </Button>
                          </Space>
                        </>
                      )}
                    />
                  </Form.Item>

                  <Form.Item name="location_type" label="Location Type">
                    <Select
                      options={[
                        { label: 'Virtual', value: 'virtual' },
                        { label: 'In Person', value: 'in_person' },
                        { label: 'Hybrid', value: 'hybrid' },
                      ]}
                      onChange={onLocationTypeChange}
                    />
                  </Form.Item>

                  {(locationType === 'virtual' || locationType === 'hybrid') && (
                    <Form.Item name="meeting_link" label="Meeting Link">
                      <Input prefix={<VideoCameraOutlined />} placeholder="https://zoom.us/..." />
                    </Form.Item>
                  )}

                  {(locationType === 'in_person' || locationType === 'hybrid') && (
                    <Form.Item name="location" label="Location">
                      <Input prefix={<EnvironmentOutlined />} placeholder="Address" />
                    </Form.Item>
                  )}

                  <Form.Item label="Recurrence">
                    <Button onClick={onOpenRecurrence}>
                      {recurrenceRule ? `Repeats ${recurrenceRule.frequency}` : 'Set Recurrence'}
                    </Button>
                    {recurrenceRule && (
                      <Button type="text" danger onClick={onClearRecurrence}>
                        Clear
                      </Button>
                    )}
                  </Form.Item>

                  <Form.Item name="application" label="Link Application" className="!mb-2">
                    <ApplicationSelect
                      className="w-full"
                      formatLabel={(a) =>
                        `${a.company_details?.name || 'Unknown'} - ${a.role_title}`
                      }
                    />
                  </Form.Item>
                  {linkHint && (
                    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50/70 px-3 py-2 text-xs text-slate-600">
                      <span className="min-w-0">
                        Looks like{' '}
                        <strong className="font-semibold text-slate-800">
                          {linkHint.company_name} · {linkHint.role_title}
                        </strong>
                        {linkHint.other_applications > 0 &&
                          ` (+${linkHint.other_applications} other at this company)`}
                      </span>
                      <Button
                        size="small"
                        type="link"
                        className="!h-auto !px-0 !text-xs"
                        onClick={() => form.setFieldValue('application', linkHint.application)}
                      >
                        Link it
                      </Button>
                    </div>
                  )}

                  <Form.Item name="notes" label="Notes">
                    <TextArea rows={3} />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EventEditorModal;
