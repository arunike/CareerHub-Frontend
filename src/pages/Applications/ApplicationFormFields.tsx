import { AutoComplete, Button, Col, DatePicker, Form, Input, Row, Select } from 'antd';

const { Option } = Select;
import type { FormInstance } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import SalaryRangeInput from '../../components/SalaryRangeInput';
import LocationSelect from '../../components/LocationSelect';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import type { Document, EmploymentType } from '../../types';

type Props = {
  form: FormInstance;
  handleAddEdit: (values: Record<string, unknown>) => void;
  documents: Document[];
  empTypes: EmploymentType[];
  editableStatusOptions: Array<{ key: string; label: string }>;
  companyListOptions: Array<{ value: string }>;
  companyListLoading: boolean;
  onCancel: () => void;
  submitLabel?: string;
  showActions?: boolean;
};

const ApplicationFormFields = ({
  form,
  handleAddEdit,
  documents,
  empTypes,
  editableStatusOptions,
  companyListOptions,
  companyListLoading,
  onCancel,
  submitLabel = 'Save',
  showActions = true,
}: Props) => (
  <Form
    scrollToFirstError={SCROLL_TO_FIRST_ERROR}
    form={form}
    layout="vertical"
    onFinish={handleAddEdit}
  >
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="company" label="Company" rules={[{ required: true }]}>
          <AutoComplete
            options={companyListOptions}
            filterOption={(input, option) =>
              String(option?.value || '')
                .toLocaleLowerCase()
                .includes(input.toLocaleLowerCase())
            }
            placeholder="Google"
            notFoundContent={companyListLoading ? 'Loading companies…' : 'Enter a new company'}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="role_title" label="Role Title" rules={[{ required: true }]}>
          <Input placeholder="Software Engineer" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="status" label="Status">
          <Select>
            {editableStatusOptions.map((stage) => (
              <Option key={stage.key} value={stage.key}>
                {stage.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="employment_type" label="Employment Type">
          <Select>
            {empTypes.map((t) => (
              <Option key={t.value} value={t.value}>
                {t.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="level" label="Level">
          <Input placeholder="e.g. L5, Senior, Staff, IC3" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="date_applied" label="Date Applied">
          <DatePicker inputReadOnly style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="office_location" label="Location">
          <LocationSelect className="w-full" placeholder="e.g. San Francisco, CA" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="salary_range" label="Salary Range">
          <SalaryRangeInput />
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item name="site_link" label="Job Link">
          <Input prefix={<GlobalOutlined />} placeholder="https://..." />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          name="job_description"
          label="Job Description"
          tooltip="Kept so you can still review the role after the posting is taken down. Pre-fills the cover letter generator."
        >
          <Input.TextArea rows={5} placeholder="Paste the job posting here (optional)" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="linked_document_ids" label="Linked Documents (Optional)">
          <Select
            mode="multiple"
            allowClear
            placeholder="Select documents to link"
            optionFilterProp="label"
            options={documents.map((doc) => ({
              value: doc.id,
              label: `${doc.title} (v${doc.version_number || 1})`,
            }))}
          />
        </Form.Item>
      </Col>
    </Row>
    {showActions ? (
      <div className="mt-4 flex justify-end gap-3">
        <Button size="large" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="large" type="primary" htmlType="submit">
          {submitLabel}
        </Button>
      </div>
    ) : null}
  </Form>
);

export default ApplicationFormFields;
