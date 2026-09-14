import type React from 'react';
import {
  Button,
  Card,
  Space,
  Form,
  Input,
  DatePicker,
  Checkbox,
  Row,
  Col,
  Switch,
  Typography,
  type FormInstance,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type Props = {
  form: FormInstance;
  handleAdd: (values: any) => void;
  isRangeMode: boolean;
  setIsRangeMode: React.Dispatch<React.SetStateAction<boolean>>;
};

const HolidayAddForm = ({ form, handleAdd, isRangeMode, setIsRangeMode }: Props) => (
  <Card id="holiday-create-form" title="Add New Holiday">
    <Form
      scrollToFirstError={SCROLL_TO_FIRST_ERROR}
      form={form}
      layout="vertical"
      onFinish={handleAdd}
      initialValues={{ is_recurring: false }}
    >
      <Row gutter={16}>
        <Col span={24} md={24} lg={24}>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ marginBottom: 12 }}>
              <Switch
                checked={isRangeMode}
                onChange={setIsRangeMode}
                checkedChildren="Range"
                unCheckedChildren="Single Day"
              />
              <Text type="secondary">Switch to Date Range</Text>
            </Space>
          </Form.Item>
        </Col>

        <Col span={24} md={8}>
          {isRangeMode ? (
            <Form.Item
              name="dateRange"
              label="Date Range"
              rules={[{ required: true, message: 'Select dates' }]}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          ) : (
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Select date' }]}
            >
              <DatePicker inputReadOnly style={{ width: '100%' }} />
            </Form.Item>
          )}
        </Col>
        <Col span={24} md={8}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Winter Break" />
          </Form.Item>
        </Col>
        <Col span={24} md={8}>
          <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Form.Item name="is_recurring" valuePropName="checked" noStyle>
                <Checkbox>Recurring (Yearly)</Checkbox>
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                size="large"
                className="w-full sm:w-auto"
              >
                Add
              </Button>
            </div>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Card>
);

export default HolidayAddForm;
