import type React from 'react';
import type { FormInstance } from 'antd';
import { Button, Input, Select, Form, Row, Col, AutoComplete } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import type { JobBoardImportResult } from '../../api';
import type { EmploymentType } from '../../types';
import ModalShell from '../../components/ModalShell';
import LocationSelect from '../../components/LocationSelect';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import SalaryRangeInput from '../../components/SalaryRangeInput';

const { Option } = Select;

type Props = {
  jobImportForm: FormInstance;
  closeJobImportModal: () => void;
  companyListLoading: unknown;
  companyListOptions: { value: string; label: string }[];
  empTypes: EmploymentType[];
  handleCreateFromJobImport: () => void;
  handleExtractJobPosting: () => void;
  isJobImportModalOpen: boolean;
  jobImportLoading: boolean;
  jobImportPreview: JobBoardImportResult | null;
  jobImportSaving: boolean;
  jobImportUrl: string;
  setJobImportUrl: React.Dispatch<React.SetStateAction<string>>;
};

const JobBoardImportModal = ({
  jobImportForm,
  closeJobImportModal,
  companyListLoading,
  companyListOptions,
  empTypes,
  handleCreateFromJobImport,
  handleExtractJobPosting,
  isJobImportModalOpen,
  jobImportLoading,
  jobImportPreview,
  jobImportSaving,
  jobImportUrl,
  setJobImportUrl,
}: Props) => (
  <ModalShell
    isOpen={isJobImportModalOpen}
    title="Import from Job URL"
    onClose={closeJobImportModal}
    maxWidthClass="max-w-[760px]"
    bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
    footer={
      <>
        <Button size="large" onClick={closeJobImportModal} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          size="large"
          icon={<GlobalOutlined />}
          loading={jobImportLoading}
          onClick={handleExtractJobPosting}
          className="w-full sm:w-auto"
        >
          Extract
        </Button>
        <Button
          size="large"
          type="primary"
          disabled={!jobImportPreview}
          loading={jobImportSaving}
          onClick={handleCreateFromJobImport}
          className="w-full sm:w-auto"
        >
          Create application
        </Button>
      </>
    }
  >
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Paste a supported job posting URL
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Paste a LinkedIn, Greenhouse, Lever, or Workday link. CareerHub will extract the fields
            and keep them editable before saving.
          </div>
        </div>
      </div>

      <Input
        size="large"
        prefix={<GlobalOutlined className="text-slate-400" />}
        placeholder="https://company.wd1.myworkdayjobs.com/..."
        value={jobImportUrl}
        onChange={(event) => setJobImportUrl(event.target.value)}
        onPressEnter={handleExtractJobPosting}
      />

      {jobImportPreview && (
        <Form scrollToFirstError={SCROLL_TO_FIRST_ERROR} form={jobImportForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="company"
                label="Company"
                rules={[{ required: true, message: 'Company is required' }]}
              >
                <AutoComplete
                  options={companyListOptions}
                  filterOption={(input, option) =>
                    String(option?.value || '')
                      .toLocaleLowerCase()
                      .includes(input.toLocaleLowerCase())
                  }
                  notFoundContent={
                    companyListLoading ? 'Loading companies…' : 'Enter a new company'
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="role_title"
                label="Role Title"
                rules={[{ required: true, message: 'Role title is required' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="office_location" label="Location">
                <LocationSelect placeholder="Remote, San Francisco, CA, ..." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="employment_type" label="Employment Type">
                <Select>
                  {empTypes.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="salary_range" label="Salary">
                <SalaryRangeInput />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="job_description" label="Job Description">
                <Input.TextArea rows={8} />
              </Form.Item>
            </Col>
          </Row>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <div>Source: {jobImportPreview.source_host}</div>
            <div
              className={
                jobImportPreview.ai_status === 'success'
                  ? 'mt-1 font-medium text-emerald-700'
                  : jobImportPreview.ai_status === 'failed'
                    ? 'mt-1 font-medium text-rose-700'
                    : 'mt-1 font-medium text-amber-700'
              }
            >
              AI status:{' '}
              {jobImportPreview.ai_status === 'success'
                ? 'Success'
                : jobImportPreview.ai_status === 'failed'
                  ? 'Failed'
                  : 'Not configured'}{' '}
              · {jobImportPreview.ai_message || 'Used the built-in parser.'}
            </div>
          </div>
        </Form>
      )}
    </div>
  </ModalShell>
);

export default JobBoardImportModal;
