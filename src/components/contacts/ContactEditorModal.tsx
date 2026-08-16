import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Checkbox, Form, Input, Select, message } from 'antd';
import Modal from '../MobileModal';
import { createContact, getApplicationOptions, updateContact } from '../../api/career';
import type { ApplicationContact, ContactRelationshipKind } from '../../types';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import { useCompanyList } from '../../hooks/useCompanyList';
import { CONTACT_RELATIONSHIP_OPTIONS } from './contactOptions';

interface ApplicationOption {
  id: number;
  role_title: string;
  status: string;
  company_details?: { id: number; name: string };
}

const applicationStatusTone = (status: string) => {
  const value = (status || '').toLocaleUpperCase();
  if (value === 'ACCEPTED') return 'bg-emerald-50 text-emerald-700';
  if (value === 'OFFER') return 'bg-blue-50 text-blue-700';
  if (value === 'REJECTED' || value === 'GHOSTED') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
};

interface ContactEditorValues {
  name: string;
  email?: string;
  job_title?: string;
  company?: string;
  notes?: string;
  connect_to_self?: boolean;
  relationship_kind?: ContactRelationshipKind;
  custom_label?: string;
  link_application?: number;
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

  // Only offered when the modal was not already opened from inside an application.
  const canPickApplication = !applicationId && !experienceId;
  const [applications, setApplications] = useState<ApplicationOption[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  const companyValue = Form.useWatch('company', form);
  const searchCompany = (companyValue || '').trim();

  // Scoped to the company rather than loading a page of all applications: the endpoint caps
  // page_size at 100, so with a few hundred applications the one you want is usually missing.
  useEffect(() => {
    if (!open || !canPickApplication || !searchCompany) {
      setApplications([]);
      setApplicationsLoading(false);
      return;
    }
    let active = true;
    setApplicationsLoading(true);
    const timer = window.setTimeout(() => {
      getApplicationOptions({ search: searchCompany, page_size: 100 })
        .then((response) => {
          if (active) setApplications(response.data as ApplicationOption[]);
        })
        .catch((error) => console.error('Failed to load applications', error))
        .finally(() => {
          if (active) setApplicationsLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [canPickApplication, open, searchCompany]);
  const linkApplication = Form.useWatch('link_application', form);

  // The company decides the link. Most companies have a single application, so choosing one
  // resolves it outright; only a company with several needs you to say which.
  const companyApplications = useMemo(() => {
    const company = (companyValue || '').trim().toLowerCase();
    if (!company) return [];
    return applications.filter(
      (application) => (application.company_details?.name || '').trim().toLowerCase() === company
    );
  }, [applications, companyValue]);

  useEffect(() => {
    if (!canPickApplication) return;
    if (companyApplications.length === 1) {
      form.setFieldsValue({ link_application: companyApplications[0].id });
      return;
    }
    // Zero, or several with none picked yet: never carry over a stale application.
    const stillValid = companyApplications.some(
      (application) => application.id === form.getFieldValue('link_application')
    );
    if (!stillValid) form.setFieldsValue({ link_application: undefined });
  }, [canPickApplication, companyApplications, form]);

  const resolvedApplication = companyApplications.find(
    (application) => application.id === linkApplication
  );

  // An existing contact may already be linked; that link is kept, not replaced.
  const linkedApplicationIds = useMemo(
    () =>
      new Set(
        (contact?.contexts || [])
          .map((context) => context.application)
          .filter((id): id is number => Boolean(id))
      ),
    [contact]
  );

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
      link_application: undefined,
    });
  }, [contact, defaultCompany, form, open]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        // The backend adds a context for whatever application id it is given and leaves
        // existing links alone, so this both links a new contact and links an existing one.
        application: applicationId ?? values.link_application,
        experience: experienceId,
      };
      delete payload.link_application;
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
          <Form.Item
            name="company"
            label="Company"
            rules={[{ required: true, whitespace: true, message: 'Enter a company' }]}
          >
            <AutoComplete
              allowClear
              filterOption={(input, option) =>
                String(option?.value ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={companyOptions}
              placeholder="Google"
              notFoundContent={companiesLoading ? 'Loading companies…' : null}
            />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input placeholder="name@company.com" />
          </Form.Item>
        </div>
        {canPickApplication && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Linked application
            </p>

            {/* Hidden: the value is derived from the company, not typed. */}
            <Form.Item name="link_application" className="!mb-0" hidden>
              <Input />
            </Form.Item>

            {applicationsLoading ? (
              <p className="mt-1.5 text-sm text-slate-400">Loading applications…</p>
            ) : !(companyValue || '').trim() ? (
              <p className="mt-1.5 text-sm text-slate-400">Pick a company above to link one.</p>
            ) : companyApplications.length === 0 ? (
              <p className="mt-1.5 text-sm text-slate-400">
                No application at {companyValue} yet, so there is nothing to link.
              </p>
            ) : companyApplications.length > 1 && !resolvedApplication ? (
              <>
                <p className="mb-2 mt-1.5 text-sm text-slate-500">
                  {companyApplications.length} applications at {companyValue} — pick the one you met
                  them through.
                </p>
                <Select
                  className="w-full"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={linkApplication}
                  onChange={(value) => form.setFieldsValue({ link_application: value })}
                  options={companyApplications.map((application) => ({
                    value: application.id,
                    label: `${application.role_title} · ${application.status}`,
                  }))}
                  placeholder="Which role?"
                />
              </>
            ) : resolvedApplication ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {resolvedApplication.role_title}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${applicationStatusTone(resolvedApplication.status)}`}
                >
                  {resolvedApplication.status}
                </span>
                {companyApplications.length > 1 && (
                  <Button
                    type="link"
                    size="small"
                    className="!h-auto !px-0 !text-xs"
                    onClick={() => form.setFieldsValue({ link_application: undefined })}
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : null}

            {linkedApplicationIds.size > 0 && (
              <p className="mt-2 text-xs text-slate-400">
                Already linked to {linkedApplicationIds.size}{' '}
                {linkedApplicationIds.size === 1 ? 'application' : 'applications'}. This adds a link
                rather than replacing them.
              </p>
            )}
          </div>
        )}

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
