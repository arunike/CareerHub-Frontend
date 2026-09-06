import { useEffect, useState } from 'react';
import { Form, Input, Segmented, Select, Tooltip, message } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { SelectProps } from 'antd';
import Modal from '../MobileModal';
import {
  createContact,
  createContactRelationship,
  updateContactRelationship,
} from '../../api/career';
import type { ApplicationContact, ContactRelationship, ContactRelationshipKind } from '../../types';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import { getApiErrorMessage } from '../../utils/apiError';
import { CONTACT_RELATIONSHIP_OPTIONS } from './contactOptions';

const DIRECTION_HELP =
  'Relationships have a direction. The person in "To" is the one who holds the role: ' +
  'From San Zhang, To Chris Wong, Manager means Chris is San’s manager. ' +
  'Flip From and To to say the opposite.';

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
  // When set the modal edits this relationship instead of creating one.
  relationship?: ContactRelationship | null;
  careerRecord?: number | null;
  onClose: () => void;
  onSaved: (relationship: ContactRelationship) => void | Promise<void>;
}

const RelationshipEditorModal = ({
  open,
  contacts,
  sourceContact,
  relationship,
  careerRecord,
  onClose,
  onSaved,
}: Props) => {
  const [form] = Form.useForm<Values>();
  const [targetMode, setTargetMode] = useState<'existing' | 'new'>('existing');
  const [saving, setSaving] = useState(false);
  const kind = Form.useWatch('kind', form);
  const source = Form.useWatch('source_contact', form);
  const isEditing = Boolean(relationship);

  useEffect(() => {
    if (!open) return;
    setTargetMode('existing');
    if (relationship) {
      form.setFieldsValue({
        source_contact: relationship.source_contact ?? 'me',
        target_contact: relationship.target_contact,
        kind: relationship.kind,
        custom_label: relationship.custom_label || '',
        new_name: '',
        new_email: '',
      });
      return;
    }
    form.setFieldsValue({
      source_contact: sourceContact?.id || 'me',
      target_contact: undefined,
      kind: 'CONTACT',
      custom_label: '',
      new_name: '',
      new_email: '',
    });
  }, [form, open, relationship, sourceContact]);

  const handleSourceChange = (value: number | 'me') => {
    const target = form.getFieldValue('target_contact') as number | undefined;
    if (value === 'me') {
      if (sourceContact && (target === undefined || target === sourceContact.id)) {
        form.setFieldsValue({ target_contact: sourceContact.id });
      }
      return;
    }
    if (target === value) form.setFieldsValue({ target_contact: undefined });
  };

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
      const payload = {
        source_contact: values.source_contact === 'me' ? null : values.source_contact,
        target_contact: targetId,
        kind: values.kind,
        custom_label: values.kind === 'CUSTOM' ? values.custom_label : '',
        // Keep whatever the relationship was already tied to; editing the kind must not drop it.
        career_record: careerRecord || sharedRecord || relationship?.career_record || null,
      };
      const response = relationship
        ? await updateContactRelationship(relationship.id, payload)
        : await createContactRelationship(payload);
      await onSaved(response.data);
      message.success(relationship ? 'Relationship updated' : 'Relationship added');
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      console.error('Failed to save relationship', error);
      message.error(getApiErrorMessage(error, 'Could not save the relationship'));
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
      title={
        <span className="flex items-center gap-2">
          {isEditing
            ? 'Edit relationship'
            : sourceContact
              ? `Add a connection for ${sourceContact.name}`
              : 'Add relationship'}
          <Tooltip title={DIRECTION_HELP}>
            <QuestionCircleOutlined className="text-sm text-slate-400 dark:text-ink-500" />
          </Tooltip>
        </span>
      }
      okText={isEditing ? 'Save changes' : 'Add relationship'}
      confirmLoading={saving}
      onOk={save}
      onCancel={onClose}
      width={560}
    >
      <Form form={form} layout="vertical" {...SCROLL_TO_FIRST_ERROR} className="pt-2">
        <Form.Item name="source_contact" label="From">
          <Select
            showSearch
            optionFilterProp="label"
            onChange={handleSourceChange}
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
            label="To"
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
        <p className="rounded-lg bg-slate-50 dark:bg-ink-900 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:text-ink-400">
          {DIRECTION_HELP} Only the relationship you specify is saved — CareerHub will not infer
          reporting lines from it.
        </p>
      </Form>
    </Modal>
  );
};

export default RelationshipEditorModal;
