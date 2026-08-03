import { Button, Drawer, Popconfirm, Tag } from 'antd';
import {
  ApartmentOutlined,
  BankOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  MergeOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ApplicationContact, ContactRelationship } from '../../types';
import { contactInitials, withoutGenericContact } from '../../components/contacts/contactOptions';

interface Props {
  contact: ApplicationContact | null;
  relationships: ContactRelationship[];
  onClose: () => void;
  onEdit: (contact: ApplicationContact) => void;
  onAddRelationship: (contact: ApplicationContact) => void;
  onEditRelationship: (relationship: ContactRelationship) => void;
  // Takes every edge in the row, since one row can cover several links between the same pair.
  onDeleteRelationship: (relationships: ContactRelationship[]) => void;
  onExplore: (contact: ApplicationContact) => void;
  onDelete: (contact: ApplicationContact) => void;
  onMerge: (contact: ApplicationContact) => void;
}

const SectionHeading = ({ children }: { children: string }) => (
  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
    {children}
  </h3>
);

const relationshipTone = (label: string) => {
  const value = label.toLocaleLowerCase();
  if (value.includes('manager')) return 'border-amber-200 bg-amber-50 text-amber-800';
  if (value.includes('recruiter')) return 'border-sky-200 bg-sky-50 text-sky-800';
  if (value.includes('interviewer')) return 'border-violet-200 bg-violet-50 text-violet-800';
  if (value.includes('coworker') || value.includes('teammate')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  return 'border-blue-200 bg-blue-50 text-blue-800';
};

const statusTone = (status: string) => {
  const value = status.toLocaleUpperCase();
  if (value === 'ACCEPTED' || value === 'CURRENT') return 'bg-emerald-50 text-emerald-700';
  if (value === 'OFFER') return 'bg-blue-50 text-blue-700';
  return 'bg-slate-100 text-slate-600';
};

const ContactDetailsDrawer = ({
  contact,
  relationships,
  onClose,
  onEdit,
  onAddRelationship,
  onEditRelationship,
  onDeleteRelationship,
  onExplore,
  onDelete,
  onMerge,
}: Props) => {
  const mine: ContactRelationship[] = [];
  const byPerson = new Map<number, ContactRelationship[]>();
  for (const relationship of contact ? relationships : []) {
    const isSource = relationship.source_contact === contact!.id;
    if (!isSource && relationship.target_contact !== contact!.id) continue;
    const otherId = isSource ? relationship.target_contact : relationship.source_contact;
    if (otherId === null) {
      mine.push(relationship);
      continue;
    }
    byPerson.set(otherId, [...(byPerson.get(otherId) || []), relationship]);
  }

  const myLabels = Array.from(new Set(withoutGenericContact(mine).map((item) => item.label)));
  const connections = Array.from(byPerson, ([otherId, items]) => {
    const first = items[0];
    const outgoing = first.source_contact === contact!.id;
    return {
      otherId,
      items,
      outgoing,
      twoWay: items.some((item) => (item.source_contact === contact!.id) !== outgoing),
      name: (outgoing ? first.target_name : first.source_name) || 'Unknown',
      labels: Array.from(new Set(withoutGenericContact(items).map((item) => item.label))),
    };
  });

  const primaryContext = contact?.contexts?.[0]?.summary;
  const company = contact?.company || primaryContext?.company;
  const jobTitle = contact?.job_title || primaryContext?.role;

  return (
    <Drawer
      open={Boolean(contact)}
      onClose={onClose}
      width="min(480px, 100vw)"
      title={null}
      styles={{ body: { padding: 0 }, header: { display: 'none' } }}
    >
      {contact && (
        <div className="flex min-h-full flex-col bg-white">
          <div className="border-b border-slate-200 bg-slate-50/60 px-5 pb-5 pt-5 sm:px-6">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold tracking-wide text-white shadow-sm">
                {contactInitials(contact.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-slate-950">
                    {contact.name}
                  </h2>
                  <Button
                    type="text"
                    size="small"
                    aria-label="Close contact details"
                    onClick={onClose}
                    className="!-mr-2 !-mt-1 !text-slate-400 hover:!bg-slate-200/70 hover:!text-slate-700"
                  >
                    <CloseOutlined />
                  </Button>
                </div>
                {(jobTitle || company) && (
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {[jobTitle, company].filter(Boolean).join(' at ')}
                  </p>
                )}
                {myLabels.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">To you:</span>
                    {myLabels.map((label) => (
                      <span
                        key={label}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${relationshipTone(label)}`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {contact.possible_duplicate && (
                  <Tag color="orange" className="mt-2">
                    Possible duplicate
                  </Tag>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(contact)}>
                Edit
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => onAddRelationship(contact)}>
                Relationship
              </Button>
              <Button
                icon={<ApartmentOutlined />}
                onClick={() => onExplore(contact)}
                className="col-span-2 sm:col-span-1"
              >
                Explore
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-7 px-5 py-6 sm:px-6">
            <section>
              <SectionHeading>Contact details</SectionHeading>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex min-w-0 items-center gap-3 px-3.5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <MailOutlined />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400">Email</p>
                    {contact.email ? (
                      <a
                        className="block truncate text-sm font-medium text-slate-700 hover:text-blue-600"
                        href={`mailto:${contact.email}`}
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <p className="text-sm text-slate-400">Not added</p>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3 border-t border-slate-100 px-3.5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <BankOutlined />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400">Work</p>
                    <p className="truncate text-sm font-medium text-slate-700">
                      {company || 'Company not added'}
                    </p>
                    {jobTitle && <p className="truncate text-xs text-slate-500">{jobTitle}</p>}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <SectionHeading>Relationships</SectionHeading>
                <span className="text-xs text-slate-400">
                  {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
                </span>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                {connections.length ? (
                  connections.map((connection) => {
                    const arrow = connection.twoWay ? '↔' : connection.outgoing ? '→' : '←';
                    const direction = connection.twoWay
                      ? `${contact.name} ↔ ${connection.name}`
                      : connection.outgoing
                        ? `${contact.name} → ${connection.name}`
                        : `${connection.name} → ${contact.name}`;
                    return (
                      <div
                        key={connection.otherId}
                        className="group flex items-center gap-3 border-b border-slate-100 px-3.5 py-3 last:border-0"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">
                          <UserOutlined />
                        </span>
                        <div className="flex min-w-0 items-center gap-1.5" title={direction}>
                          <span className="shrink-0 text-sm text-slate-300">{arrow}</span>
                          <p className="truncate text-sm font-medium text-slate-800">
                            {connection.name}
                          </p>
                        </div>
                        <span
                          title={`${direction} · ${connection.labels.join(' · ')}`}
                          className={`ml-auto shrink-0 truncate rounded-full border px-2.5 py-1 text-[11px] font-medium ${relationshipTone(connection.labels[0] || '')}`}
                        >
                          {connection.labels.join(' · ')}
                        </span>
                        <div className="flex shrink-0 items-center transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                          <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined />}
                            aria-label={`Edit relationship ${direction}`}
                            onClick={() => onEditRelationship(connection.items[0])}
                          />
                          <Popconfirm
                            title="Remove this relationship?"
                            description={
                              connection.items.length > 1
                                ? `Removes all ${connection.items.length} links between these two. Both contacts stay.`
                                : 'The contacts stay; only the link between them goes.'
                            }
                            okText="Remove"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => onDeleteRelationship(connection.items)}
                          >
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              aria-label={`Remove relationship ${direction}`}
                            />
                          </Popconfirm>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3.5 py-4 text-sm text-slate-400">
                    No connections to other people yet.
                  </div>
                )}
              </div>
            </section>

            <section>
              <SectionHeading>Career context</SectionHeading>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                {contact.contexts?.length ? (
                  contact.contexts.map((context) => (
                    <div
                      key={context.id}
                      className="border-b border-slate-100 px-3.5 py-3.5 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {context.summary.company}
                        </p>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {context.summary.type === 'APPLICATION' ? 'Application' : 'Experience'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-slate-500">{context.summary.role}</p>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusTone(context.summary.status)}`}
                        >
                          {context.summary.status}
                        </span>
                      </div>
                      {context.notes && (
                        <p className="mt-2 whitespace-pre-wrap border-l-2 border-slate-200 pl-2 text-xs leading-relaxed text-slate-500">
                          {context.notes}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-3.5 py-4 text-sm text-slate-400">
                    No application or experience context.
                  </div>
                )}
              </div>
            </section>

            {contact.notes && (
              <section>
                <SectionHeading>Notes</SectionHeading>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-600">
                  {contact.notes}
                </p>
              </section>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-6">
            {contact.possible_duplicate ? (
              <Button size="small" icon={<MergeOutlined />} onClick={() => onMerge(contact)}>
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
              <Button danger size="small" type="text" icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default ContactDetailsDrawer;
