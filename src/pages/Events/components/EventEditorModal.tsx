import { Button, Collapse, Col, DatePicker, Form, Input, Modal, Row, Select, Space, TimePicker, Typography } from 'antd';
import { EnvironmentOutlined, PlusOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import type { EventCategory, RecurrenceRule } from '../../../types';
import CategoryBadge from '../../../components/CategoryBadge';
import IconPicker from '../../../components/IconPicker';

const { Text } = Typography;
const { TextArea } = Input;

type ApplicationOption = {
  id: number;
  company_details?: { name: string };
  role_title: string;
};

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
  applications: ApplicationOption[];
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
  applications,
}: EventEditorModalProps) => {
  const resetMeridiemColumnScroll = (open: boolean) => {
    if (!open) return;
    const reset = () => {
      const columns = document.querySelectorAll(
        '.event-timepicker-dropdown .ant-picker-time-panel-column[data-type="meridiem"]'
      );
      columns.forEach((column) => {
        (column as HTMLElement).scrollTop = 0;
      });
    };

    requestAnimationFrame(reset);
    setTimeout(reset, 120);
  };

  return (
    <Modal title={editingId ? 'Edit Event' : 'Add Event'} open={open} onCancel={onCancel} footer={null} width={600}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Event Name" rules={[{ required: true }]}>
          <Input placeholder="Team Sync" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="timezone" label="Timezone">
              <Select options={['PT', 'MT', 'CT', 'ET'].map((t) => ({ label: t, value: t }))} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="start_time" label="Start Time" rules={[{ required: true }]}>
              <TimePicker
                use12Hours
                format="h:mm a"
                style={{ width: '100%' }}
                minuteStep={5}
                popupClassName="event-timepicker-dropdown"
                onOpenChange={resetMeridiemColumnScroll}
                onChange={(val) => {
                  if (val) {
                    const end = val.add(defaultDuration, 'minute');
                    form.setFieldValue('end_time', end);
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_time" label="End Time" rules={[{ required: true }]}>
              <TimePicker
                use12Hours
                format="h:mm a"
                style={{ width: '100%' }}
                minuteStep={5}
                popupClassName="event-timepicker-dropdown"
                onOpenChange={resetMeridiemColumnScroll}
              />
            </Form.Item>
          </Col>
        </Row>

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
                            <IconPicker value={newCategoryIcon} onChange={onNewCategoryIconChange} />
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

                  <Form.Item name="application" label="Link Application">
                    <Select
                      allowClear
                      options={applications.map((a) => ({
                        label: `${a.company_details?.name || 'Unknown'} - ${a.role_title}`,
                        value: a.id,
                      }))}
                    />
                  </Form.Item>

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
