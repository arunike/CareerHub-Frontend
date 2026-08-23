import React, { useMemo, useState } from 'react';
import { Form, Input, DatePicker, Checkbox, Tabs, message, Select, Upload, Tooltip } from 'antd';
import Modal from '../../components/MobileModal';
import { LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Experience, EmploymentType } from '../../types';
import CompensationFields, { type CompValue } from '../../components/CompensationFields';
import { getMediaUrl } from '../../lib/runtimeConfig';
import { LogoCropModal } from './LogoCropModal';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import { useCompanyList } from '../../hooks/useCompanyList';
import UnitNumberInput from '../../components/UnitNumberInput';
import ExperienceLogoField from './ExperienceLogoField';
import RoleContextPicker from './RoleContextPicker';
import { parseResumeExperience } from './experienceResumeParse';
import { useExperienceFormSync } from './useExperienceFormSync';
import ExperienceImportForm from './ExperienceImportForm';
import ExperienceDateFields from './ExperienceDateFields';

export interface OfferOption {
  value: number;
  label: string;
  base_salary?: number;
  bonus?: number;
  equity?: number;
  company?: string;
  title?: string;
  level?: string;
  location?: string;
  employment_type?: string;
}

interface ExperienceModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (
    data: Partial<Experience>,
    logoFile?: File | null,
    removeLogo?: boolean
  ) => Promise<void>;
  experience?: Experience | null;
  experiences?: Experience[];
  employmentTypes?: EmploymentType[];
  offers?: OfferOption[];
}

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const DEFAULT_EMP_TYPES: EmploymentType[] = [
  { value: 'full_time', label: 'Full-time', color: 'blue' },
  { value: 'part_time', label: 'Part-time', color: 'teal' },
  { value: 'internship', label: 'Internship', color: 'amber' },
  { value: 'contract', label: 'Contract', color: 'purple' },
  { value: 'freelance', label: 'Freelance', color: 'orange' },
];

const MAX_LOGO_FILE_BYTES = 4 * 1024 * 1024;

const toNullableNumber = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ExperienceModal: React.FC<ExperienceModalProps> = ({
  open,
  onCancel,
  onSave,
  experience,
  experiences = [],
  employmentTypes,
  offers = [],
}) => {
  const empTypes =
    employmentTypes && employmentTypes.length > 0 ? employmentTypes : DEFAULT_EMP_TYPES;
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [isCurrent, setIsCurrent] = useState(false);
  const [employmentType, setEmploymentType] = useState<string>('full_time');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const { options: applicationCompanyOptions } = useCompanyList(open);
  const roleContext = Form.useWatch('role_context', form) ?? 'none';

  const { handleOfferSelect } = useExperienceFormSync({
    open,
    experience,
    offers,
    form,
    importForm,
    setIsCurrent,
    setEmploymentType,
    setCompanyName,
    setLogoFile,
    setLogoPreview,
    setRemoveLogo,
    logoPreview,
    setActiveTab,
  });

  const experienceCompanyOptions = useMemo(() => {
    const seen = new Map<string, { name: string; logo: string | null }>();
    for (const exp of experiences) {
      if (exp.id === experience?.id) continue;
      const key = exp.company.toLowerCase();
      const logo = getMediaUrl(exp.logo);
      if (!seen.has(key)) {
        seen.set(key, { name: exp.company, logo });
      } else if (logo && !seen.get(key)!.logo) {
        seen.set(key, { ...seen.get(key)!, logo });
      }
    }
    return Array.from(seen.values()).map(({ name, logo }) => ({
      value: name,
      logoUrl: logo,
    }));
  }, [experiences, experience]);

  const companyOptions = useMemo(() => {
    const options = new Map<string, { value: string; logoUrl: string | null }>();
    for (const option of applicationCompanyOptions) {
      options.set(option.value.toLocaleLowerCase(), { value: option.value, logoUrl: null });
    }
    for (const option of experienceCompanyOptions) {
      options.set(option.value.toLocaleLowerCase(), option);
    }
    return Array.from(options.values());
  }, [applicationCompanyOptions, experienceCompanyOptions]);

  const isExistingCompany = useMemo(() => {
    if (!companyName) return false;
    return experienceCompanyOptions.some(
      (option) => option.value.toLowerCase() === companyName.toLowerCase()
    );
  }, [companyName, experienceCompanyOptions]);

  const handleCompanySelect = async (_value: string, option: { logoUrl?: string | null }) => {
    const logoUrl: string | null = option.logoUrl ?? null;
    if (!logoUrl || logoFile) return; // don't overwrite a manually chosen logo
    try {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      const file = new File([blob], 'company-logo', { type: blob.type });
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(blob));
      setRemoveLogo(false);
    } catch {
      console.error('Failed to fetch company logo from URL:', logoUrl);
    }
  };

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const handleLogoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Logo must be an image file.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      message.error('Logo must be smaller than 4 MB.');
      return Upload.LIST_IGNORE;
    }
    const objUrl = URL.createObjectURL(file);
    setCropImageSrc(objUrl);
    setCropModalOpen(true);
    return false; // prevent auto-upload
  };

  const handleOpenAdjustModal = () => {
    if (currentLogoSrc) {
      setCropImageSrc(currentLogoSrc);
      setCropModalOpen(true);
    }
  };

  const handleApplyCrop = (croppedFile: File, previewUrl: string) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(croppedFile);
    setLogoPreview(previewUrl);
    setRemoveLogo(false);
    setCropModalOpen(false);
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const currentLogoSrc = logoPreview || (!removeLogo && getMediaUrl(experience?.logo)) || null;

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (activeTab === 'manual') {
        const values = await form.validateFields();

        const datesVal = values.dates;
        const start_date = datesVal
          ? dayjs.isDayjs(datesVal)
            ? datesVal.format('YYYY-MM-DD')
            : (datesVal[0]?.format('YYYY-MM-DD') ?? null)
          : null;
        const end_date =
          !values.is_current && Array.isArray(datesVal) && datesVal[1]
            ? datesVal[1].format('YYYY-MM-DD')
            : null;
        const selectedEmploymentType = values.employment_type || 'full_time';
        const isInternship = selectedEmploymentType === 'internship';
        const normalizedHourlyRate = toNullableNumber(values.hourly_rate);
        const payload: Partial<Experience> = {
          title: values.title,
          company: values.company,
          level: values.level || '',
          work_email: values.work_email || '',
          location: values.location,
          employment_type: selectedEmploymentType,
          start_date,
          end_date,
          is_current: values.is_current || false,
          description: values.description,
          is_promotion: values.role_context === 'promotion',
          is_return_offer: values.role_context === 'return_offer',
          offer: values.offer ?? null,
          hourly_rate: isInternship ? normalizedHourlyRate : null,
          hours_per_day: isInternship ? (experience?.hours_per_day ?? null) : null,
          working_days_per_week: isInternship ? (experience?.working_days_per_week ?? null) : null,
          total_hours_worked: isInternship ? (experience?.total_hours_worked ?? null) : null,
          overtime_hours: isInternship ? (experience?.overtime_hours ?? null) : null,
          overtime_rate: isInternship ? (experience?.overtime_rate ?? null) : null,
          overtime_multiplier: isInternship ? (experience?.overtime_multiplier ?? null) : null,
          total_earnings_override: isInternship
            ? (experience?.total_earnings_override ?? null)
            : null,
          base_salary: (values.comp as CompValue)?.base_salary ?? null,
          bonus: (values.comp as CompValue)?.bonus ?? null,
          equity: (values.comp as CompValue)?.equity ?? null,
        };

        if (form.isFieldTouched('skills')) {
          payload.skills = values.skills || [];
        }

        await onSave(payload, logoFile, removeLogo);
      } else {
        const values = await importForm.validateFields();
        await onSave({
          title: 'Imported Role',
          company: 'Imported Company',
          description: values.raw_text,
          is_current: false,
        });
      }
      onCancel();
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTextPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const parsed = parseResumeExperience(e.target.value);
    if (!parsed) return;

    form.setFieldsValue({
      title: parsed.title || form.getFieldValue('title'),
      company: parsed.company || form.getFieldValue('company'),
      location: parsed.location || form.getFieldValue('location'),
      description: parsed.description || form.getFieldValue('description'),
      dates: parsed.dates || form.getFieldValue('dates'),
      is_current: parsed.isCurrent || form.getFieldValue('is_current'),
    });

    if (parsed.isCurrent) setIsCurrent(true);
    if (parsed.company) setCompanyName(parsed.company);

    importForm.resetFields();
    setActiveTab('manual');
    message.success('Resume text successfully parsed! Please review the extracted fields.');
  };

  return (
    <Modal
      title={experience ? 'Edit Experience' : 'Add Experience'}
      open={open}
      onCancel={onCancel}
      confirmLoading={saving}
      onOk={handleSubmit}
      okText="Save Experience"
      width={700}
      destroyOnClose
    >
      {!experience && (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'manual', label: 'Manual Entry' },
            { key: 'import', label: 'Quick Import' },
          ]}
        />
      )}

      {activeTab === 'manual' && (
        <Form
          scrollToFirstError={SCROLL_TO_FIRST_ERROR}
          form={form}
          layout="vertical"
          className="mt-4"
          onValuesChange={(changed) => {
            if (changed.company !== undefined) setCompanyName(changed.company || '');
            if (changed.employment_type !== undefined) {
              setEmploymentType(changed.employment_type);
            }
            if (changed.offer !== undefined) {
              const linked = offers.find((o) => o.value === changed.offer);
              if (linked) {
                const currentVals = form.getFieldsValue();
                const updates: Record<string, any> = {
                  comp: {
                    base_salary: linked.base_salary ?? currentVals.comp?.base_salary ?? null,
                    bonus: linked.bonus ?? currentVals.comp?.bonus ?? null,
                    equity: linked.equity ?? currentVals.comp?.equity ?? null,
                  } as CompValue,
                };

                if (linked.company) {
                  updates.company = linked.company;
                  setCompanyName(linked.company);
                }
                if (linked.title) updates.title = linked.title;
                if (linked.level) updates.level = linked.level;
                if (linked.location) updates.location = linked.location;
                if (linked.employment_type) {
                  updates.employment_type = linked.employment_type;
                  setEmploymentType(linked.employment_type);
                }

                form.setFieldsValue(updates);
                message.info('Autofilled role details from linked offer!');
              }
            }
          }}
        >
          {/* Logo Upload */}
          <ExperienceLogoField
            companyName={companyName}
            currentLogoSrc={currentLogoSrc}
            handleLogoSelect={handleLogoSelect}
            handleOpenAdjustModal={handleOpenAdjustModal}
            handleRemoveLogo={handleRemoveLogo}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Form.Item
              name="title"
              label="Job Title"
              rules={[{ required: true, message: 'Please enter job title' }]}
            >
              <Input placeholder="e.g. Software Engineer" />
            </Form.Item>
            <Form.Item name="level" label="Level">
              <Input placeholder="e.g. L5, Senior, Staff, IC3" />
            </Form.Item>
            <Form.Item name="work_email" label="Work Email">
              <Input type="email" placeholder="you@company.com" />
            </Form.Item>
            <Form.Item name="employment_type" label="Employment Type">
              <Select>
                {empTypes.map((t) => (
                  <Select.Option key={t.value} value={t.value}>
                    {t.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <ExperienceDateFields
            form={form}
            companyOptions={companyOptions}
            handleCompanySelect={handleCompanySelect}
            setCompanyName={setCompanyName}
          />

          <div className="flex items-center gap-4 mb-4">
            <Form.Item name="is_current" valuePropName="checked" className="mb-0">
              <Checkbox
                className="min-h-11 items-center lg:min-h-0"
                onChange={(event) => setIsCurrent(event.target.checked)}
              >
                I currently work here
              </Checkbox>
            </Form.Item>
          </div>

          <Form.Item
            name="dates"
            label="Duration"
            dependencies={['is_current']}
            rules={[
              { required: true, message: 'Please select start date' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  const current = getFieldValue('is_current');
                  if (!current && Array.isArray(value) && (!value[0] || !value[1])) {
                    return Promise.reject(
                      new Error('End date is required unless "I currently work here" is checked')
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            {isCurrent ? (
              <DatePicker inputReadOnly className="w-full" placeholder="Start Date" />
            ) : (
              <RangePicker inputReadOnly className="w-full" />
            )}
          </Form.Item>

          <Form.Item name="description" label="Description & Achievements">
            <TextArea
              rows={8}
              placeholder="• Developed feature X resulting in Y% improvement&#10;• Led team of Z engineers"
            />
          </Form.Item>

          <Form.Item
            name="skills"
            label="Skills"
            tooltip="Auto-extracted from your description, but you can manually add, edit, or remove them at any time. Type and press Enter."
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="e.g. React, Docker, Python"
            />
          </Form.Item>

          {/* Compensation */}
          {employmentType === 'internship' ? (
            <div className="space-y-3">
              <Form.Item
                name="hourly_rate"
                label="Hourly Rate"
                rules={[
                  { required: true, message: 'Please enter hourly rate for this internship' },
                ]}
              >
                <UnitNumberInput unit="$/hr" min={0} step={0.01} placeholder="e.g. 45.00" />
              </Form.Item>

              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Advanced internship earnings inputs like hours per day, working days per week, total
                hours, overtime, and direct total override can be edited from the role's `Internship
                Earnings Breakdown` after you save.
              </div>
            </div>
          ) : (
            <Form.Item name="comp" label="Compensation">
              <CompensationFields />
            </Form.Item>
          )}

          {/* Link Offer — for lifecycle continuity and raise history */}
          {offers.length > 0 && (
            <Form.Item
              name="offer"
              label={
                <span className="flex items-center gap-1.5">
                  <LinkOutlined className="text-blue-400" />
                  Start from an offer
                  <Tooltip title="Connect this role to its application and offer. The application stays in Applications and is marked Accepted.">
                    <span className="text-gray-400 cursor-help text-xs">(optional)</span>
                  </Tooltip>
                </span>
              }
              extra="Choose an offer for a connected Application → Experience record. Leave blank for a historical role."
            >
              <Select
                allowClear
                placeholder="Select the offer that led to this role…"
                options={offers}
                showSearch
                optionFilterProp="label"
                onChange={handleOfferSelect}
              />
            </Form.Item>
          )}

          {/* Role context — custom card selector */}
          <RoleContextPicker
            form={form}
            isExistingCompany={isExistingCompany}
            roleContext={roleContext}
          />
        </Form>
      )}

      {activeTab === 'import' && (
        <ExperienceImportForm importForm={importForm} handleTextPaste={handleTextPaste} />
      )}

      <LogoCropModal
        open={cropModalOpen}
        imageSrc={cropImageSrc}
        onCancel={() => setCropModalOpen(false)}
        onApply={handleApplyCrop}
      />
    </Modal>
  );
};

export default ExperienceModal;
