import React, { useEffect, useState } from 'react';
import { Form, Input, Modal, DatePicker, Switch, Tabs, Button, message, Select } from 'antd';
import dayjs from 'dayjs';
import type { Experience } from '../../types';

interface ExperienceModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (data: Partial<Experience>) => Promise<void>;
  experience?: Experience | null;
}

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const ExperienceModal: React.FC<ExperienceModalProps> = ({ open, onCancel, onSave, experience }) => {
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (open) {
      if (experience) {
        setActiveTab('manual');
        setIsCurrent(!!experience.is_current);
        form.setFieldsValue({
          title: experience.title,
          company: experience.company,
          location: experience.location,
          dates: experience.start_date ? [
            dayjs(experience.start_date),
            experience.end_date ? dayjs(experience.end_date) : undefined
          ] : undefined,
          is_current: experience.is_current,
          description: experience.description,
          skills: experience.skills || [],
        });
      } else {
        form.resetFields();
        importForm.resetFields();
        setIsCurrent(false);
      }
    }
  }, [open, experience, form, importForm]);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (activeTab === 'manual') {
        const values = await form.validateFields();
        const start_date = values.dates?.[0] ? values.dates[0].format('YYYY-MM-DD') : null;
        const end_date = !values.is_current && values.dates?.[1] ? values.dates[1].format('YYYY-MM-DD') : null;
        
        await onSave({
          title: values.title,
          company: values.company,
          location: values.location,
          start_date,
          end_date,
          skills: values.skills,
          is_current: values.is_current || false,
          description: values.description,
        });
      } else {
        // Fallback if they click save immediately in Quick Import without auto-parsing firing
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

    // Try parsing dates into dayjs
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
              if (end.isValid()) {
                dateValues = [start, end];
              } else {
                dateValues = [start, undefined];
              }
            }
          } else {
            // single date or unstructured dates
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
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="title"
              label="Job Title"
              rules={[{ required: true, message: 'Please enter job title' }]}
            >
              <Input placeholder="e.g. Software Engineer" />
            </Form.Item>
            <Form.Item
              name="company"
              label="Company"
              rules={[{ required: true, message: 'Please enter company name' }]}
            >
              <Input placeholder="e.g. Google" />
            </Form.Item>
          </div>
          
          <Form.Item name="location" label="Location">
            <Input placeholder="e.g. San Francisco, CA (Remote)" />
          </Form.Item>

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
