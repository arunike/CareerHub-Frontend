import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Popconfirm, Spin, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { createContact, deleteContact, getContacts, updateContact } from '../api/career';
import type { ApplicationContact } from '../types';
import { INVALID_FIELD_CLASS, useRequiredFields } from '../hooks/useRequiredFields';

const { TextArea } = Input;

interface Draft {
  name: string;
  email: string;
  notes: string;
}

const emptyDraft = (): Draft => ({ name: '', email: '', notes: '' });

const FIELD_LABEL =
  'mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400';

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

interface Props {
  // Exactly one of these identifies who the contacts belong to.
  applicationId?: number;
  experienceId?: number;
  description?: string;
}

const ContactsPanel = ({ applicationId, experienceId, description }: Props) => {
  const [contacts, setContacts] = useState<ApplicationContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const { register, errorFor, validate, clearError, clearAll } = useRequiredFields<'name'>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getContacts(
        applicationId ? { application: applicationId } : { experience: experienceId }
      );
      const payload = response.data;
      setContacts(Array.isArray(payload) ? payload : (payload?.results ?? []));
    } catch (error) {
      console.error('Failed to load contacts', error);
      message.error('Could not load contacts');
    } finally {
      setLoading(false);
    }
  }, [applicationId, experienceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const startAdd = () => {
    clearAll();
    setEditingId('new');
    setDraft(emptyDraft());
  };

  const startEdit = (contact: ApplicationContact) => {
    clearAll();
    setEditingId(contact.id);
    setDraft({ name: contact.name, email: contact.email ?? '', notes: contact.notes ?? '' });
  };

  const cancelEdit = () => {
    clearAll();
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    if (!validate({ name: { value: draft.name, label: 'Name' } })) return;
    const name = draft.name.trim();

    setSaving(true);
    try {
      const payload = { name, email: draft.email.trim(), notes: draft.notes.trim() };
      if (editingId === 'new') {
        const owner = applicationId ? { application: applicationId } : { experience: experienceId };
        await createContact({ ...owner, ...payload });
      } else if (typeof editingId === 'number') {
        await updateContact(editingId, payload);
      }
      cancelEdit();
      await load();
    } catch (error) {
      console.error('Failed to save contact', error);
      message.error('Could not save the contact');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (contact: ApplicationContact) => {
    try {
      await deleteContact(contact.id);
      await load();
    } catch (error) {
      console.error('Failed to delete contact', error);
      message.error('Could not delete the contact');
    }
  };

  const editor = (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={FIELD_LABEL} htmlFor="contact-name">
            Name{' '}
            <span className="text-rose-500" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="contact-name"
            {...register('name')}
            value={draft.name}
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, name: e.target.value }));
              if (errorFor('name')) clearError('name');
            }}
            placeholder="Sarah Chen"
            status={errorFor('name') ? 'error' : undefined}
            aria-invalid={!!errorFor('name')}
            className={`!rounded-lg ${errorFor('name') ? INVALID_FIELD_CLASS : ''}`}
            autoFocus
            onPressEnter={save}
          />
          {errorFor('name') && <p className="mt-1 text-[11px] text-rose-500">{errorFor('name')}</p>}
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="contact-email">
            Email <span className="font-normal normal-case text-slate-300">optional</span>
          </label>
          <Input
            id="contact-email"
            value={draft.email}
            onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="sarah@company.com"
            type="email"
            className="!rounded-lg"
            onPressEnter={save}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className={FIELD_LABEL} htmlFor="contact-notes">
          Notes <span className="font-normal normal-case text-slate-300">optional</span>
        </label>
        <TextArea
          id="contact-notes"
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="How they responded, what to follow up on…"
          className="!rounded-lg"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button size="small" className="!rounded-lg !text-xs !font-semibold" onClick={cancelEdit}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          loading={saving}
          className="!rounded-lg !px-4 !text-xs !font-semibold"
          onClick={save}
        >
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Contacts
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {description ?? 'Recruiters and interviewers for this application.'}
          </p>
        </div>
        {editingId === null && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="small"
              icon={<PlusOutlined />}
              className="!rounded-lg !px-3 !text-xs !font-semibold"
              onClick={startAdd}
            >
              Contact
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : (
        <div className="space-y-2">
          {editingId === 'new' && editor}

          {contacts.length === 0 && editingId === null && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <UserOutlined className="text-lg text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">
                No contacts yet. Add the recruiter or interviewers so you know who to follow up
                with.
              </p>
            </div>
          )}

          {contacts.map((contact) =>
            editingId === contact.id ? (
              <div key={contact.id}>{editor}</div>
            ) : (
              <div
                key={contact.id}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-300"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                  {initialsOf(contact.name) || <UserOutlined />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {contact.name}
                    </span>
                    {contact.inherited && (
                      <span
                        className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                        title="Added on the application that led to this role. Edit it there."
                      >
                        from application
                      </span>
                    )}
                  </div>
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="truncate text-xs text-slate-500 hover:text-blue-600"
                    >
                      {contact.email}
                    </a>
                  )}
                  {contact.notes && (
                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                      {contact.notes}
                    </p>
                  )}
                </div>

                <div
                  className={`flex shrink-0 items-center gap-1 transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
                    contact.inherited ? 'hidden' : 'opacity-100 md:opacity-0'
                  }`}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    aria-label={`Edit ${contact.name}`}
                    onClick={() => startEdit(contact)}
                  />
                  <Popconfirm
                    title="Delete this contact?"
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => remove(contact)}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Delete ${contact.name}`}
                    />
                  </Popconfirm>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ContactsPanel;
