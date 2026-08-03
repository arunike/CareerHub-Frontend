import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Segmented, Select, message } from 'antd';
import {
  ApartmentOutlined,
  BarsOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  deleteContact,
  deleteContactRelationship,
  getContactRelationships,
  getContacts,
  mergeContacts,
} from '../../api/career';
import { getApiErrorMessage } from '../../utils/apiError';
import type { ApplicationContact, ContactRelationship, ContactRelationshipKind } from '../../types';
import { ListSkeleton, PageHeaderSkeleton } from '../../components/SkeletonLoader';
import { PageState } from '../../components/PageState';
import Modal from '../../components/MobileModal';
import ContactEditorModal from '../../components/contacts/ContactEditorModal';
import RelationshipEditorModal from '../../components/contacts/RelationshipEditorModal';
import {
  CONTACT_RELATIONSHIP_OPTIONS,
  withoutGenericContact,
} from '../../components/contacts/contactOptions';
import ContactDetailsDrawer from './ContactDetailsDrawer';
import ContactList from './ContactList';
import ContactNetwork from './ContactNetwork';

type ViewMode = 'list' | 'network';
type ContextFilter = 'ALL' | 'APPLICATION' | 'EXPERIENCE';
type GroupMode = 'NONE' | 'COMPANY' | 'CAREER';
const NO_COMPANY_FILTER = '__NO_COMPANY__';

const contactCompanies = (contact: ApplicationContact) =>
  Array.from(
    new Set(
      [
        contact.company,
        ...(contact.contexts || []).map((context) => context.summary.company),
      ].filter((company): company is string => Boolean(company?.trim()))
    )
  );

const ContactsPage = () => {
  const [contacts, setContacts] = useState<ApplicationContact[]>([]);
  const [relationships, setRelationships] = useState<ContactRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('ALL');
  const [relationshipFilter, setRelationshipFilter] = useState<ContactRelationshipKind | 'ALL'>(
    'ALL'
  );
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [groupMode, setGroupMode] = useState<GroupMode>('NONE');
  const [selected, setSelected] = useState<ApplicationContact | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ApplicationContact | null>(null);
  const [relationshipSource, setRelationshipSource] = useState<ApplicationContact | null>(null);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<ContactRelationship | null>(null);
  const [mergeContact, setMergeContact] = useState<ApplicationContact | null>(null);
  const [mergeDuplicateId, setMergeDuplicateId] = useState<number>();
  const [merging, setMerging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [contactResponse, relationshipResponse] = await Promise.all([
        getContacts(),
        getContactRelationships(),
      ]);
      setContacts(contactResponse.data);
      setRelationships(relationshipResponse.data);
    } catch (error) {
      console.error('Failed to load contacts workspace', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const contactsById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts]
  );

  const contextFiltered = useMemo(
    () =>
      contacts.filter((contact) => {
        if (contextFilter === 'APPLICATION') {
          return contact.contexts?.some((context) => context.application);
        }
        if (contextFilter === 'EXPERIENCE') {
          return contact.contexts?.some((context) => context.experience);
        }
        return true;
      }),
    [contacts, contextFilter]
  );

  const companyOptions = useMemo(() => {
    const companies = Array.from(new Set(contacts.flatMap(contactCompanies))).sort((a, b) =>
      a.localeCompare(b)
    );
    const hasUnassignedContacts = contacts.some(
      (contact) => contactCompanies(contact).length === 0
    );
    return [
      { value: 'ALL', label: 'All companies' },
      ...companies.map((company) => ({ value: company, label: company })),
      ...(hasUnassignedContacts ? [{ value: NO_COMPANY_FILTER, label: 'No company' }] : []),
    ];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return contextFiltered.filter((contact) => {
      const companies = contactCompanies(contact);
      if (
        companyFilter !== 'ALL' &&
        (companyFilter === NO_COMPANY_FILTER
          ? companies.length > 0
          : !companies.includes(companyFilter))
      ) {
        return false;
      }
      const contactRelationships = relationships.filter(
        (relationship) =>
          relationship.source_contact === contact.id || relationship.target_contact === contact.id
      );
      if (
        relationshipFilter !== 'ALL' &&
        !contactRelationships.some((relationship) => relationship.kind === relationshipFilter)
      ) {
        return false;
      }
      if (!query) return true;
      const searchable = [
        contact.name,
        contact.email,
        contact.job_title,
        contact.company,
        contact.notes,
        ...(contact.contexts || []).flatMap((context) => [
          context.summary.company,
          context.summary.role,
          context.summary.status,
        ]),
        ...contactRelationships.flatMap((relationship) => [
          relationship.label,
          relationship.source_name,
          relationship.target_name,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return searchable.includes(query);
    });
  }, [companyFilter, contextFiltered, relationshipFilter, relationships, search]);

  const groupedContacts = useMemo(() => {
    const groups = new Map<string, ApplicationContact[]>();
    for (const contact of filteredContacts) {
      const firstContext = contact.contexts?.[0];
      const key =
        groupMode === 'COMPANY'
          ? companyFilter !== 'ALL'
            ? companyFilter === NO_COMPANY_FILTER
              ? 'No company'
              : companyFilter
            : contact.company || firstContext?.summary.company || 'No company'
          : groupMode === 'CAREER'
            ? firstContext
              ? `${firstContext.summary.company} · ${firstContext.summary.role}`
              : 'No linked application'
            : 'All contacts';
      groups.set(key, [...(groups.get(key) || []), contact]);
    }
    return Array.from(groups.entries());
  }, [companyFilter, filteredContacts, groupMode]);

  const filteredContactIds = useMemo(
    () => new Set(filteredContacts.map((contact) => contact.id)),
    [filteredContacts]
  );
  const visibleFocusId = focusId !== null && filteredContactIds.has(focusId) ? focusId : null;
  const networkRelationships = useMemo(
    () =>
      relationships.filter(
        (relationship) =>
          (relationship.source_contact === null ||
            filteredContactIds.has(relationship.source_contact)) &&
          filteredContactIds.has(relationship.target_contact) &&
          (relationshipFilter === 'ALL' || relationship.kind === relationshipFilter)
      ),
    [filteredContactIds, relationshipFilter, relationships]
  );

  const relationshipSummary = (contact: ApplicationContact) => {
    const direct = relationships.filter(
      (relationship) =>
        relationship.source_contact === null && relationship.target_contact === contact.id
    );
    if (direct.length) {
      return Array.from(new Set(withoutGenericContact(direct).map((item) => item.label))).join(
        ' · '
      );
    }
    const connected = relationships.find(
      (relationship) =>
        relationship.source_contact === contact.id || relationship.target_contact === contact.id
    );
    if (!connected) return 'Not connected';
    const viaId =
      connected.source_contact === contact.id ? connected.target_contact : connected.source_contact;
    return viaId ? `Via ${contactsById.get(viaId)?.name || 'contact'}` : connected.label;
  };

  const saveRefresh = async () => {
    await load();
  };

  const removeRelationship = async (targets: ContactRelationship[]) => {
    try {
      await Promise.all(targets.map((target) => deleteContactRelationship(target.id)));
      message.success(targets.length > 1 ? 'Relationships removed' : 'Relationship removed');
      await load();
    } catch (error) {
      console.error('Failed to remove relationship', error);
      message.error(getApiErrorMessage(error, 'Could not remove the relationship'));
    }
  };

  const remove = async (contact: ApplicationContact) => {
    try {
      await deleteContact(contact.id);
      if (selected?.id === contact.id) setSelected(null);
      if (focusId === contact.id) setFocusId(null);
      message.success('Contact deleted');
      await load();
    } catch (error) {
      console.error('Failed to delete contact', error);
      message.error('Could not delete the contact');
    }
  };

  const merge = async () => {
    if (!mergeContact || !mergeDuplicateId) return;
    setMerging(true);
    try {
      await mergeContacts(mergeContact.id, mergeDuplicateId);
      message.success('Contacts merged');
      setMergeContact(null);
      setMergeDuplicateId(undefined);
      setSelected(null);
      await load();
    } catch (error) {
      console.error('Failed to merge contacts', error);
      message.error('Could not merge these contacts');
    } finally {
      setMerging(false);
    }
  };

  const explore = (contact: ApplicationContact) => {
    setView('network');
    setFocusId(contact.id);
    setSelected(null);
  };

  const focusSearchResult = () => {
    const first = filteredContacts[0];
    if (!first) return;
    setView('network');
    setFocusId(first.id);
    setSelected(first);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (loadError) {
    return (
      <PageState
        title="Contacts are unavailable"
        description="Your saved contacts are unchanged. Try loading the workspace again."
        actionLabel="Try again"
        onAction={() => void load()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Career relationships
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Contacts</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            People you met while applying and the relationships that continued into your work.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingContact(null);
            setEditorOpen(true);
          }}
        >
          Add contact
        </Button>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          allowClear
          prefix={<SearchOutlined className="text-slate-400" />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onPressEnter={focusSearchResult}
          placeholder="Search people, companies, roles, notes, or relationships"
          className="max-w-xl"
        />
        <Segmented
          value={view}
          onChange={(value) => setView(value as ViewMode)}
          options={[
            { value: 'list', label: 'List', icon: <BarsOutlined /> },
            { value: 'network', label: 'Network', icon: <ApartmentOutlined /> },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={contextFilter}
          onChange={setContextFilter}
          className="min-w-40"
          options={[
            { value: 'ALL', label: 'All contexts' },
            { value: 'APPLICATION', label: 'Applications' },
            { value: 'EXPERIENCE', label: 'Experiences' },
          ]}
        />
        <Select
          value={relationshipFilter}
          onChange={setRelationshipFilter}
          className="min-w-44"
          options={[{ value: 'ALL', label: 'All relationships' }, ...CONTACT_RELATIONSHIP_OPTIONS]}
        />
        <Select
          showSearch
          optionFilterProp="label"
          value={companyFilter}
          onChange={setCompanyFilter}
          className="min-w-44"
          aria-label="Filter contacts by company"
          options={companyOptions}
        />
        {view === 'list' && (
          <Select
            value={groupMode}
            onChange={setGroupMode}
            className="min-w-44"
            options={[
              { value: 'NONE', label: 'No grouping' },
              { value: 'COMPANY', label: 'Group by company' },
              { value: 'CAREER', label: 'Group by linked application' },
            ]}
          />
        )}
        <span className="ml-auto text-xs text-slate-400">
          {filteredContacts.length} {filteredContacts.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      {view === 'network' ? (
        <ContactNetwork
          contacts={filteredContacts}
          relationships={networkRelationships}
          focusId={visibleFocusId}
          onSelect={(contact) => {
            setFocusId(contact.id);
            setSelected(contact);
          }}
          onBackToMe={() => setFocusId(null)}
        />
      ) : filteredContacts.length ? (
        <ContactList
          groups={groupedContacts}
          groupMode={groupMode}
          relationshipSummary={relationshipSummary}
          onSelect={setSelected}
        />
      ) : (
        <PageState
          icon={<TeamOutlined />}
          title={contacts.length ? 'No contacts match' : 'No contacts yet'}
          description={
            contacts.length
              ? 'Try changing the search or filters.'
              : 'Add someone you met through an application or experience.'
          }
          actionLabel={contacts.length ? undefined : 'Add contact'}
          onAction={
            contacts.length
              ? undefined
              : () => {
                  setEditingContact(null);
                  setEditorOpen(true);
                }
          }
        />
      )}

      <ContactDetailsDrawer
        contact={selected}
        relationships={relationships}
        onClose={() => setSelected(null)}
        onEdit={(contact) => {
          setSelected(null);
          setEditingContact(contact);
          setEditorOpen(true);
        }}
        onAddRelationship={(contact) => {
          setSelected(null);
          setRelationshipSource(contact);
          setEditingRelationship(null);
          setRelationshipOpen(true);
        }}
        onEditRelationship={(relationship) => {
          setSelected(null);
          setRelationshipSource(null);
          setEditingRelationship(relationship);
          setRelationshipOpen(true);
        }}
        onDeleteRelationship={(targets) => void removeRelationship(targets)}
        onExplore={explore}
        onDelete={(contact) => void remove(contact)}
        onMerge={(contact) => {
          setSelected(null);
          setMergeContact(contact);
          setMergeDuplicateId(undefined);
        }}
      />

      <ContactEditorModal
        open={editorOpen}
        contact={editingContact}
        onClose={() => setEditorOpen(false)}
        onSaved={async (contact) => {
          if (selected?.id === contact.id) setSelected(contact);
          await load();
        }}
      />
      <RelationshipEditorModal
        open={relationshipOpen}
        contacts={contacts}
        sourceContact={relationshipSource}
        relationship={editingRelationship}
        careerRecord={relationshipSource?.contexts?.[0]?.career_record}
        onClose={() => setRelationshipOpen(false)}
        onSaved={saveRefresh}
      />
      <Modal
        open={Boolean(mergeContact)}
        title="Merge duplicate contact"
        okText="Merge contacts"
        confirmLoading={merging}
        okButtonProps={{ disabled: !mergeDuplicateId }}
        onOk={merge}
        onCancel={() => setMergeContact(null)}
      >
        <p className="mb-4 text-sm text-slate-500">
          Linked applications, notes, and relationships will be kept on {mergeContact?.name}.
        </p>
        <Select
          showSearch
          optionFilterProp="label"
          value={mergeDuplicateId}
          onChange={setMergeDuplicateId}
          placeholder="Choose the duplicate person"
          className="w-full"
          options={contacts
            .filter((contact) => contact.id !== mergeContact?.id)
            .map((contact) => ({
              value: contact.id,
              label: `${contact.name}${contact.email ? ` · ${contact.email}` : ''}`,
            }))}
        />
      </Modal>
    </div>
  );
};

export default ContactsPage;
