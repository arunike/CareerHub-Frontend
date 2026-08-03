import { useEffect, useState } from 'react';
import { Form, Input, Segmented, Select, message } from 'antd';
import type { SelectProps } from 'antd';
import Modal from '../MobileModal';
import { createContact, createContactRelationship } from '../../api/career';
import type { ApplicationContact, ContactRelationship, ContactRelationshipKind } from '../../types';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import { CONTACT_RELATIONSHIP_OPTIONS } from './contactOptions';

interface Values {
  source_contact?: number | 'me';
  target_contact?: number;
  kind: ContactRelationshipKind;
  custom_label?: string;
  new_name?: string;
  new_email?: string;
}

interface Props {
  open: boolean;
  contacts: ApplicationContact[];
  sourceContact?: ApplicationContact | null;
  careerRecord?: number | null;
  onClose: () => void;
  onSaved: (relationship: ContactRelationship) => void | Promise<void>;
}

const RelationshipEditorModal = ({
  open,
  contacts,
  sourceContact,
  careerRecord,
  onClose,
  onSaved,
}: Props) => {
  const [form] = Form.useForm<Values>();
  const [targetMode, setTargetMode] = useState<'existing' | 'new'>('existing');
  const [saving, setSaving] = useState(false);
  const kind = Form.useWatch('kind', form);
  const source = Form.useWatch('source_contact', form);

  useEffect(() => {
    if (!open) return;
    setTargetMode('existing');
    form.setFieldsValue({
      source_contact: sourceContact?.id || 'me',
      target_contact: undefined,
      kind: 'CONTACT',
      custom_label: '',
      new_name: '',
      new_email: '',
    });
  }, [form, open, sourceContact]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      let targetId = values.target_contact;
      if (targetMode === 'new') {
        const response = await createContact({
          name: values.new_name,
          email: values.new_email,
          connect_to_self: false,
        });
        targetId = response.data.id;
      }
      if (!targetId) return;
      const selectedSource = contacts.find(
        (contact) =>
          contact.id === (values.source_contact === 'me' ? undefined : values.source_contact)
      );
      const selectedTarget = contacts.find((contact) => contact.id === targetId);
      const sourceRecords = new Set(
        selectedSource?.contexts?.map((context) => context.career_record) || []
      );
      const sharedRecord = selectedTarget?.contexts?.find((context) =>
        sourceRecords.has(context.career_record)
      )?.career_record;
      const response = await createContactRelationship({
        source_contact: values.source_contact === 'me' ? null : values.source_contact,
        target_contact: targetId,
        kind: values.kind,
        custom_label: values.kind === 'CUSTOM' ? values.custom_label : '',
        career_record: careerRecord || sharedRecord || null,
      });
      await onSaved(response.data);
      message.success('Relationship added');
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      console.error('Failed to add relationship', error);
      message.error('Could not add the relationship');
    } finally {
      setSaving(false);
    }
  };

  const sourceRecordIds = new Set(
    contacts
      .find((contact) => contact.id === (source === 'me' ? undefined : source))
      ?.contexts?.map((context) => context.career_record) || []
  );
  const candidates = contacts.filter(
    (contact) => contact.id !== (source === 'me' ? undefined : source)
  );
  const asOption = (contact: ApplicationContact) => ({
    value: contact.id,
    label: `${contact.name}${contact.company ? ` · ${contact.company}` : ''}`,
  });
  const suggestedOptions = candidates
    .filter((contact) =>
      contact.contexts?.some((context) => sourceRecordIds.has(context.career_record))
    )
    .map(asOption);
  const suggestedIds = new Set(suggestedOptions.map((option) => option.value));
  const otherOptions = candidates.filter((contact) => !suggestedIds.has(contact.id)).map(asOption);
  const contactOptions: SelectProps<number>['options'] = suggestedOptions.length
    ? [
        { label: 'Suggested from the same experience', options: suggestedOptions },
        { label: 'Other contacts', options: otherOptions },
      ]
    : otherOptions;

  return (
    <Modal
      open={open}
      title={sourceContact ? `Add a connection for ${sourceContact.name}` : 'Add relationship'}
      okText="Add relationship"
      confirmLoading={saving}
      onOk={save}
      onCancel={onClose}
      width={560}
    >
      <Form form={form} layout="vertical" {...SCROLL_TO_FIRST_ERROR} className="pt-2">
        <Form.Item name="source_contact" label="From">
          <Select
            options={[
              { value: 'me', label: 'Me' },
              ...contacts.map((contact) => ({ value: contact.id, label: contact.name })),
            ]}
          />
        </Form.Item>

        <div className="mb-4">
          <Segmented
            block
            value={targetMode}
            onChange={(value) => setTargetMode(value as 'existing' | 'new')}
            options={[
              { value: 'existing', label: 'Existing contact' },
              { value: 'new', label: 'New person' },
            ]}
          />
        </div>

        {targetMode === 'existing' ? (
          <Form.Item
            name="target_contact"
            label="Person"
            rules={[{ required: true, message: 'Choose a person' }]}
          >
            <Select showSearch optionFilterProp="label" options={contactOptions} />
          </Form.Item>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="new_name"
              label="Name"
              rules={[{ required: true, whitespace: true, message: 'Enter a name' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="new_email" label="Email" rules={[{ type: 'email' }]}>
              <Input />
            </Form.Item>
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item name="kind" label="Relationship" rules={[{ required: true }]}>
            <Select options={CONTACT_RELATIONSHIP_OPTIONS} />
          </Form.Item>
          {kind === 'CUSTOM' && (
            <Form.Item
              name="custom_label"
              label="Custom relationship"
              rules={[{ required: true, whitespace: true, message: 'Enter a relationship' }]}
            >
              <Input placeholder="Former teammate" maxLength={80} />
            </Form.Item>
          )}
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          This creates only the relationship you specify. CareerHub will not infer reporting lines.
        </p>
      </Form>
    </Modal>
  );
};

export default RelationshipEditorModal;
