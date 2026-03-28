import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Modal, DatePicker, Switch, Tabs, Button, message, Select, Upload, Avatar, AutoComplete, Tooltip } from 'antd';
import { CameraOutlined, DeleteOutlined, BankOutlined, RiseOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Experience, EmploymentType } from '../../types';
import CompensationFields, { type CompValue } from '../../components/CompensationFields';

const toRelativeMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try { return new URL(url).pathname; } catch { return url; }
};

interface OfferOption {
  value: number;
  label: string;
  base_salary?: number;
  bonus?: number;
  equity?: number;
}

interface ExperienceModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (data: Partial<Experience>, logoFile?: File | null, removeLogo?: boolean) => Promise<void>;
  experience?: Experience | null;
  experiences?: Experience[];
  employmentTypes?: EmploymentType[];
  offers?: OfferOption[];
}

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const getAvatarStyle = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
  ];
  let hash = 0;
  const safeName = name || '';
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return { backgroundImage: gradients[Math.abs(hash) % gradients.length], color: '#fff', border: 'none' };
};

const DEFAULT_EMP_TYPES: EmploymentType[] = [
  { value: 'full_time', label: 'Full-time', color: 'blue' },
  { value: 'part_time', label: 'Part-time', color: 'teal' },
  { value: 'internship', label: 'Internship', color: 'amber' },
  { value: 'contract', label: 'Contract', color: 'purple' },
  { value: 'freelance', label: 'Freelance', color: 'orange' },
];

const ExperienceModal: React.FC<ExperienceModalProps> = ({ open, onCancel, onSave, experience, experiences = [], employmentTypes, offers = [] }) => {
  const empTypes = (employmentTypes && employmentTypes.length > 0) ? employmentTypes : DEFAULT_EMP_TYPES;
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

  useEffect(() => {
    if (open) {
      if (experience) {
        setActiveTab('manual');
        setIsCurrent(!!experience.is_current);
        setCompanyName(experience.company || '');
        const empType = experience.employment_type || 'full_time';
        setEmploymentType(empType);
        form.setFieldsValue({
          title: experience.title,
          company: experience.company,
          location: experience.location,
          dates: experience.start_date ? [
            dayjs(experience.start_date),
            experience.end_date ? dayjs(experience.end_date) : undefined
          ] : undefined,
          is_current: experience.is_current,
          employment_type: empType,
          description: experience.description,
          skills: experience.skills || [],
          is_promotion: experience.is_promotion || false,
          offer: experience.offer ?? null,
          hourly_rate: experience.hourly_rate ?? null,
          comp: {
            base_salary: experience.base_salary ?? null,
            bonus: experience.bonus ?? null,
            equity: experience.equity ?? null,
          } as CompValue,
        });

        if (experience.offer) {
          const linked = offers.find(o => o.value === experience.offer);
          if (linked) {
            form.setFieldsValue({
              comp: {
                base_salary: linked.base_salary ?? null,
                bonus: linked.bonus ?? null,
                equity: linked.equity ?? null,
              } as CompValue,
            });
          }
        }
      } else {
        form.resetFields();
        importForm.resetFields();
        setIsCurrent(false);
        setEmploymentType('full_time');
        setCompanyName('');
      }
      setLogoFile(null);
      setLogoPreview(null);
      setRemoveLogo(false);
    }
  }, [open, experience, form, importForm, offers]);

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const companyOptions = useMemo(() => {
    const seen = new Map<string, { name: string; logo: string | null }>();
    for (const exp of experiences) {
      if (exp.id === experience?.id) continue;
      const key = exp.company.toLowerCase();
      const logo = toRelativeMediaUrl(exp.logo);
      if (!seen.has(key)) {
        seen.set(key, { name: exp.company, logo });
      } else if (logo && !seen.get(key)!.logo) {
        seen.set(key, { ...seen.get(key)!, logo });
      }
    }
    return Array.from(seen.values()).map(({ name, logo }) => ({
      value: name,   // plain string → shown in input after selection
      logoUrl: logo, // extra data used by optionRender and onSelect
    }));
  }, [experiences, experience]);

  const isExistingCompany = useMemo(() => {
    if (!companyName) return false;
    return companyOptions.some(opt => opt.value.toLowerCase() === companyName.toLowerCase());
  }, [companyName, companyOptions]);

  const handleCompanySelect = async (_value: string, option: any) => {
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

  const handleLogoSelect = (file: File) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
    return false; // prevent auto-upload
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const currentLogoSrc = logoPreview || (!removeLogo && toRelativeMediaUrl(experience?.logo)) || null;

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (activeTab === 'manual') {
        const values = await form.validateFields();

        const datesVal = values.dates;
        const start_date = datesVal
          ? (dayjs.isDayjs(datesVal) ? datesVal.format('YYYY-MM-DD') : datesVal[0]?.format('YYYY-MM-DD') ?? null)
          : null;
        const end_date = !values.is_current && Array.isArray(datesVal) && datesVal[1]
          ? datesVal[1].format('YYYY-MM-DD')
          : null;

        await onSave(
          {
            title: values.title,
            company: values.company,
            location: values.location,
            employment_type: values.employment_type || 'full_time',
            start_date,
            end_date,
            skills: values.skills,
            is_current: values.is_current || false,
            description: values.description,
            is_promotion: values.is_promotion || false,
            offer: values.offer ?? null,
            hourly_rate: values.hourly_rate ?? null,
            base_salary: (values.comp as CompValue)?.base_salary ?? null,
            bonus: (values.comp as CompValue)?.bonus ?? null,
            equity: (values.comp as CompValue)?.equity ?? null,
          },
          logoFile,
          removeLogo,
        );
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
    const text = e.target.value;
    if (!text || text.length < 10) return;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return;

    let parsedTitle = '';
    let parsedCompany = '';
    let parsedLocation = '';
    let parsedDates = '';
    const descriptionLines: string[] = [];

    const isBullet = (str: string) => str.startsWith('-') || str.startsWith('•') || str.startsWith('*');

    let i = 0;
    while (i < lines.length && !isBullet(lines[i])) {
      if (i === 0) {
        parsedTitle = lines[i];
      } else if (i === 1) {
        parsedCompany = lines[i];
      } else if (i === 2) {
        if (/([0-9]{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lines[i]) && !lines[i].toLowerCase().includes('remote')) {
          parsedDates = lines[i];
        } else {
          parsedLocation = lines[i];
        }
      } else if (i === 3) {
        if (/([0-9]{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lines[i])) {
          parsedDates = lines[i];
        } else {
          descriptionLines.push(lines[i]);
        }
      } else {
        descriptionLines.push(lines[i]);
      }
      i++;
    }

    while (i < lines.length) {
      descriptionLines.push(lines[i]);
      i++;
    }

    let dateValues: any = undefined;
    let isCurrentVal = false;
    if (parsedDates) {
      const parts = parsedDates.split(/-|–|to/i).map(s => s.trim());
      if (parts.length > 0) {
        let start = dayjs(parts[0]);
        if (start.isValid()) {
          if (parts.length > 1) {
            if (parts[1].toLowerCase().includes('present') || parts[1].toLowerCase().includes('current')) {
              isCurrentVal = true;
              dateValues = [start, undefined];
            } else {
              let end = dayjs(parts[1]);
              dateValues = end.isValid() ? [start, end] : [start, undefined];
            }
          } else {
            dateValues = [start, undefined];
          }
        }
      }
    }

    form.setFieldsValue({
      title: parsedTitle || form.getFieldValue('title'),
      company: parsedCompany || form.getFieldValue('company'),
      location: parsedLocation || form.getFieldValue('location'),
      description: descriptionLines.join('\n') || form.getFieldValue('description'),
      dates: dateValues || form.getFieldValue('dates'),
      is_current: isCurrentVal || form.getFieldValue('is_current'),
    });

    if (isCurrentVal) setIsCurrent(true);
    if (parsedCompany) setCompanyName(parsedCompany);

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
          form={form}
          layout="vertical"
          className="mt-4"
          onValuesChange={(changed) => {
            if (changed.company !== undefined) setCompanyName(changed.company || '');
            if (changed.employment_type !== undefined) setEmploymentType(changed.employment_type);
            if (changed.offer !== undefined) {
              const linked = offers.find(o => o.value === changed.offer);
              if (linked) {
                form.setFieldsValue({
                  comp: {
                    base_salary: linked.base_salary ?? null,
                    bonus: linked.bonus ?? null,
                    equity: linked.equity ?? null,
                  } as CompValue,
                });
              }
            }
          }}
        >
          {/* Logo Upload */}
          <div className="flex justify-center mb-6">
            <div className="relative group/logo">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleLogoSelect}
              >
                <div className="cursor-pointer">
                  {currentLogoSrc ? (
                    <Avatar
                      size={72}
                      src={currentLogoSrc}
                      className="shadow-md border-4 border-white ring-2 ring-gray-100"
                    />
                  ) : (
                    <Avatar
                      size={72}
                      style={getAvatarStyle(companyName)}
                      className="font-bold text-2xl shadow-md border-4 border-white ring-2 ring-gray-100"
                    >
                      {companyName?.charAt(0)?.toUpperCase() || <BankOutlined />}
                    </Avatar>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                    <CameraOutlined className="text-white text-lg" />
                  </div>
                </div>
              </Upload>

              {/* Remove button */}
              {currentLogoSrc && (
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                  title="Remove logo"
                >
                  <DeleteOutlined style={{ fontSize: 10 }} />
                </button>
              )}
            </div>
            <div className="ml-3 flex flex-col justify-center">
              <Upload accept="image/*" showUploadList={false} beforeUpload={handleLogoSelect}>
                <Button size="small" icon={<CameraOutlined />} type="link" className="p-0 text-gray-500 hover:text-blue-500">
                  {currentLogoSrc ? 'Change logo' : 'Upload logo'}
                </Button>
              </Upload>
              <span className="text-xs text-gray-400">PNG, JPG up to 2MB</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="title"
              label="Job Title"
              rules={[{ required: true, message: 'Please enter job title' }]}
            >
              <Input placeholder="e.g. Software Engineer" />
            </Form.Item>
            <Form.Item name="employment_type" label="Employment Type">
              <Select>
                {empTypes.map(t => (
                  <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="company"
              label="Company"
              rules={[{ required: true, message: 'Please enter company name' }]}
            >
              <AutoComplete
                options={companyOptions}
                optionRender={(option) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {option.data.logoUrl
                      ? <Avatar size={18} src={option.data.logoUrl} />
                      : <Avatar size={18} style={getAvatarStyle(option.value as string)}>
                          {(option.value as string).charAt(0).toUpperCase()}
                        </Avatar>
                    }
                    <span>{option.value as string}</span>
                  </div>
                )}
                onSelect={handleCompanySelect}
                onChange={(val) => {
                  const name = val || '';
                  setCompanyName(name);
                  const matches = companyOptions.some(opt => opt.value.toLowerCase() === name.toLowerCase());
                  if (!matches) form.setFieldValue('is_promotion', false);
                }}
                filterOption={(input, option) =>
                  (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                }
                placeholder="e.g. Google"
              />
            </Form.Item>
            <Form.Item name="location" label="Location">
              <Input placeholder="e.g. San Francisco, CA (Remote)" />
            </Form.Item>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <Form.Item name="is_current" valuePropName="checked" className="mb-0">
              <Switch onChange={setIsCurrent} />
            </Form.Item>
            <span className="text-gray-600">I currently work here</span>
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
                    return Promise.reject(new Error('End date is required unless "I currently work here" is checked'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            {isCurrent ? (
              <DatePicker className="w-full" placeholder="Start Date" />
            ) : (
              <RangePicker className="w-full" />
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
            <Select mode="tags" style={{ width: '100%' }} placeholder="e.g. React, Docker, Python" />
          </Form.Item>

          {/* Compensation */}
          {employmentType === 'internship' ? (
            <Form.Item name="hourly_rate" label="Hourly Rate">
              <Input prefix="$" suffix="/hr" type="number" min={0} step={0.01} placeholder="e.g. 45.00" style={{ width: '50%' }} />
            </Form.Item>
          ) : (
            <Form.Item name="comp" label="Compensation">
              <CompensationFields />
            </Form.Item>
          )}

          {/* Link Offer — for raise history tracking */}
          {offers.length > 0 && (
            <Form.Item
              name="offer"
              label={
                <span className="flex items-center gap-1.5">
                  <LinkOutlined className="text-blue-400" />
                  Link Offer
                  <Tooltip title="Link a compensation offer to enable raise history tracking for this role. Raise history is stored on the offer.">
                    <span className="text-gray-400 cursor-help text-xs">(optional)</span>
                  </Tooltip>
                </span>
              }
            >
              <Select
                allowClear
                placeholder="Select an offer to link raise tracking…"
                options={offers}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}

          {/* Promotion toggle — only shown when company matches an existing one */}
          {isExistingCompany && <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 mt-1">
            <Form.Item name="is_promotion" valuePropName="checked" className="mb-0 mt-0.5">
              <Switch size="small" />
            </Form.Item>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                <RiseOutlined />
                Promotion / role change at the same company
              </div>
              <div className="text-xs text-amber-600 mt-0.5">
                Mark this on your <strong>new</strong> role — groups it with your previous role at the same company
              </div>
            </div>
          </div>}
        </Form>
      )}

      {activeTab === 'import' && (
        <Form form={importForm} layout="vertical" className="mt-4">
          <Form.Item
            name="raw_text"
            label="Paste Resume Section"
            help="Paste the full block for a single role (Title, Company, Dates, and Bullets). We'll automatically build the form for you!"
            rules={[{ required: true, message: 'Please paste your experience text' }]}
          >
            <TextArea
              rows={10}
              placeholder="Job Title&#10;Company Name&#10;San Jose, CA&#10;Start Date - End Date&#10;- Bullet point 1&#10;- Bullet point 2&#10;- Bullet point 3..."
              onChange={handleTextPaste}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default ExperienceModal;
