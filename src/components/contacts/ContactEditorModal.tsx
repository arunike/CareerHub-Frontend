import { useEffect, useMemo, useState } from 'react';
import { Checkbox, Form, Input, Select, message } from 'antd';
import Modal from '../MobileModal';
import { createContact, updateContact } from '../../api/career';
import type { ApplicationContact, ContactRelationshipKind } from '../../types';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import { useCompanyList } from '../../hooks/useCompanyList';
import { CONTACT_RELATIONSHIP_OPTIONS } from './contactOptions';

interface ContactEditorValues {
  name: string;
  email?: string;
  job_title?: string;
  company?: string;
  notes?: string;
  connect_to_self?: boolean;
  relationship_kind?: ContactRelationshipKind;
  custom_label?: string;
}

interface Props {
  open: boolean;
  contact?: ApplicationContact | null;
  applicationId?: number;
  experienceId?: number;
  defaultCompany?: string;
  onClose: () => void;
  onSaved: (contact: ApplicationContact) => void | Promise<void>;
}

const ContactEditorModal = ({
  open,
  contact,
  applicationId,
  experienceId,
  defaultCompany,
  onClose,
  onSaved,
}: Props) => {
  const [form] = Form.useForm<ContactEditorValues>();
  const [saving, setSaving] = useState(false);
  const { options: sharedCompanyOptions, loading: companiesLoading } = useCompanyList(open);
  const relationshipKind = Form.useWatch('relationship_kind', form);

  const companyOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            contact?.company,
            defaultCompany,
            ...sharedCompanyOptions.map((option) => option.value),
          ].filter((company): company is string => Boolean(company?.trim()))
        )
      ).map((company) => ({ value: company, label: company })),
    [contact?.company, defaultCompany, sharedCompanyOptions]
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: contact?.name || '',
      email: contact?.email || '',
      job_title: contact?.job_title || '',
      company: contact?.company || defaultCompany || '',
      notes: contact?.notes || '',
      connect_to_self: contact ? undefined : true,
      relationship_kind: 'CONTACT',
      custom_label: '',
    });
  }, [contact, defaultCompany, form, open]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        application: applicationId,
        experience: experienceId,
      };
      if (contact) {
        delete payload.connect_to_self;
        delete payload.relationship_kind;
        delete payload.custom_label;
      }
      const response = contact
        ? await updateContact(contact.id, payload)
        : await createContact(payload);
      await onSaved(response.data);
      message.success(contact ? 'Contact updated' : 'Contact added');
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      console.error('Failed to save contact', error);
      message.error('Could not save the contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={contact ? 'Edit contact' : 'Add contact'}
      okText={contact ? 'Save changes' : 'Add contact'}
      confirmLoading={saving}
      onOk={save}
      onCancel={onClose}
      width={620}
    >
      <Form form={form} layout="vertical" {...SCROLL_TO_FIRST_ERROR} className="pt-2">
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, whitespace: true, message: 'Enter a name' }]}
          >
            <Input placeholder="Name" autoFocus />
          </Form.Item>
          <Form.Item name="job_title" label="Job title">
            <Input placeholder="Senior engineer" />
          </Form.Item>
          <Form.Item name="company" label="Company">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={companiesLoading}
              options={companyOptions}
              placeholder="Select an application company"
              notFoundContent={companiesLoading ? 'Loading companies…' : 'No application companies'}
            />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input placeholder="name@company.com" />
          </Form.Item>
        </div>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} placeholder="What you know or want to remember" />
        </Form.Item>

        {!contact && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <Form.Item name="connect_to_self" valuePropName="checked" className="!mb-3">
              <Checkbox>Add this person to my relationship network</Checkbox>
            </Form.Item>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Form.Item name="relationship_kind" label="Relationship" className="!mb-0">
                <Select options={CONTACT_RELATIONSHIP_OPTIONS} />
              </Form.Item>
              {relationshipKind === 'CUSTOM' && (
                <Form.Item
                  name="custom_label"
                  label="Custom relationship"
                  rules={[{ required: true, whitespace: true, message: 'Enter a relationship' }]}
                  className="!mb-0"
                >
                  <Input placeholder="Project lead" maxLength={80} />
                </Form.Item>
              )}
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default ContactEditorModal;
