import { Button, Drawer, Popconfirm, Tag } from 'antd';
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  MergeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ApplicationContact, ContactRelationship } from '../../types';
import { contactInitials } from '../../components/contacts/contactOptions';

interface Props {
  contact: ApplicationContact | null;
  relationships: ContactRelationship[];
  onClose: () => void;
  onEdit: (contact: ApplicationContact) => void;
  onAddRelationship: (contact: ApplicationContact) => void;
  onExplore: (contact: ApplicationContact) => void;
  onDelete: (contact: ApplicationContact) => void;
  onMerge: (contact: ApplicationContact) => void;
}

const ContactDetailsDrawer = ({
  contact,
  relationships,
  onClose,
  onEdit,
  onAddRelationship,
  onExplore,
  onDelete,
  onMerge,
}: Props) => {
  const related = contact
    ? relationships.filter(
        (relationship) =>
          relationship.source_contact === contact.id || relationship.target_contact === contact.id
      )
    : [];

  return (
    <Drawer
      open={Boolean(contact)}
      onClose={onClose}
      width="min(440px, 100vw)"
      title={null}
      styles={{ body: { padding: 0 } }}
    >
      {contact && (
        <div className="min-h-full bg-white">
          <div className="border-b border-slate-100 px-5 pb-5 pt-6 sm:px-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {contactInitials(contact.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-slate-950">
                    {contact.name}
                  </h2>
                  {contact.possible_duplicate && <Tag color="orange">Possible duplicate</Tag>}
                </div>
                {(contact.job_title || contact.company) && (
                  <p className="mt-1 text-sm text-slate-500">
                    {[contact.job_title, contact.company].filter(Boolean).join(' at ')}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button icon={<EditOutlined />} onClick={() => onEdit(contact)}>
                Edit
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => onAddRelationship(contact)}>
                Relationship
              </Button>
              <Button
                type="primary"
                icon={<ApartmentOutlined />}
                onClick={() => onExplore(contact)}
              >
                Explore
              </Button>
            </div>
          </div>

          <div className="space-y-7 px-5 py-6 sm:px-6">
            {contact.email && (
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Contact
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {contact.email && (
                    <a
                      className="flex items-center gap-2 text-slate-600 hover:text-blue-600"
                      href={`mailto:${contact.email}`}
                    >
                      <MailOutlined /> {contact.email}
                    </a>
                  )}
                </div>
              </section>
            )}

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Relationships
              </p>
              <div className="mt-3 space-y-2">
                {related.length ? (
                  related.map((relationship) => (
                    <div
                      key={relationship.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {relationship.source_contact === contact.id
                            ? relationship.target_name
                            : relationship.source_name}
                        </p>
                        <p className="text-xs text-slate-500">{relationship.label}</p>
                      </div>
                      {relationship.source_contact === null && <Tag>Direct</Tag>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No relationships added yet.</p>
                )}
              </div>
            </section>

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Career context
              </p>
              <div className="mt-3 space-y-2">
                {contact.contexts?.length ? (
                  contact.contexts.map((context) => (
                    <div key={context.id} className="rounded-xl border border-slate-200 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {context.summary.company}
                        </p>
                        <Tag>
                          {context.summary.type === 'APPLICATION' ? 'Application' : 'Experience'}
                        </Tag>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {context.summary.role} · {context.summary.status}
                      </p>
                      {context.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
                          {context.notes}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No application or experience context.</p>
                )}
              </div>
            </section>

            {contact.notes && (
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Notes
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {contact.notes}
                </p>
              </section>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              {contact.possible_duplicate ? (
                <Button icon={<MergeOutlined />} onClick={() => onMerge(contact)}>
                  Merge duplicate
                </Button>
              ) : (
                <span />
              )}
              <Popconfirm
                title="Delete this contact?"
                description="Relationships and career links for this person will also be removed."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(contact)}
              >
                <Button danger type="text" icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default ContactDetailsDrawer;
