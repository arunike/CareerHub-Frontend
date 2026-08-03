import { useCallback, useEffect, useState } from 'react';
import { Button, Popconfirm, Spin, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { deleteContact, getContacts } from '../api/career';
import type { ApplicationContact } from '../types';
import ContactEditorModal from './contacts/ContactEditorModal';
import { contactInitials } from './contacts/contactOptions';

interface Props {
  applicationId?: number;
  experienceId?: number;
  description?: string;
}

const ContactsPanel = ({ applicationId, experienceId, description }: Props) => {
  const [contacts, setContacts] = useState<ApplicationContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ApplicationContact | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getContacts(
        applicationId ? { application: applicationId } : { experience: experienceId }
      );
      setContacts(response.data);
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

  const openEditor = (contact: ApplicationContact | null) => {
    setEditingContact(contact);
    setEditorOpen(true);
  };

  const remove = async (contact: ApplicationContact) => {
    try {
      await deleteContact(
        contact.id,
        applicationId ? { application: applicationId } : { experience: experienceId }
      );
      message.success('Contact removed from this record');
      await load();
    } catch (error) {
      console.error('Failed to remove contact', error);
      message.error('Could not remove the contact');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Contacts
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {description ?? 'People you met through this application.'}
          </p>
        </div>
        <Button
          size="small"
          icon={<PlusOutlined />}
          className="!rounded-lg !px-3 !text-xs !font-semibold"
          onClick={() => openEditor(null)}
        >
          Contact
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <UserOutlined className="text-lg text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">
                No contacts yet. Add someone you met through this record.
              </p>
            </div>
          )}

          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-300"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                {contactInitials(contact.name) || <UserOutlined />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">
                    {contact.name}
                  </span>
                  {contact.inherited && <Tag>from application</Tag>}
                  {contact.possible_duplicate && <Tag color="orange">possible duplicate</Tag>}
                </div>
                {(contact.job_title || contact.company) && (
                  <p className="truncate text-xs text-slate-500">
                    {[contact.job_title, contact.company].filter(Boolean).join(' · ')}
                  </p>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="block truncate text-xs text-slate-500 hover:text-blue-600"
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
              {!contact.inherited && (
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    aria-label={`Edit ${contact.name}`}
                    onClick={() => openEditor(contact)}
                  />
                  <Popconfirm
                    title="Remove this contact from this record?"
                    description="The person remains in Contacts if used elsewhere."
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void remove(contact)}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Remove ${contact.name}`}
                    />
                  </Popconfirm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ContactEditorModal
        open={editorOpen}
        contact={editingContact}
        applicationId={applicationId}
        experienceId={experienceId}
        onClose={() => setEditorOpen(false)}
        onSaved={async () => load()}
      />
    </div>
  );
};

export default ContactsPanel;
