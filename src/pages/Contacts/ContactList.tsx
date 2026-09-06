import { RightOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import type { ApplicationContact } from '../../types';
import { contactInitials } from '../../components/contacts/contactOptions';

type GroupMode = 'NONE' | 'COMPANY' | 'CAREER';

interface Props {
  groups: Array<[string, ApplicationContact[]]>;
  groupMode: GroupMode;
  relationshipSummary: (contact: ApplicationContact) => string;
  onSelect: (contact: ApplicationContact) => void;
}

const columnGrid =
  'sm:grid-cols-[minmax(220px,1.35fr)_minmax(150px,0.8fr)_minmax(220px,1.15fr)_minmax(160px,0.75fr)_20px]';

const relationshipTone = (relationship: string) => {
  const value = relationship.toLocaleLowerCase();
  if (value.includes('manager'))
    return 'border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200';
  if (value.includes('recruiter'))
    return 'border-sky-200 dark:border-sky-500/25 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200';
  if (value.includes('interviewer'))
    return 'border-violet-200 dark:border-violet-500/25 bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-200';
  if (value.includes('coworker') || value.includes('teammate')) {
    return 'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
  }
  if (value === 'not connected')
    return 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 text-slate-500 dark:text-ink-400';
  return 'border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200';
};

const contextCounts = (contact: ApplicationContact) => {
  const contexts = contact.contexts || [];
  return {
    applications: contexts.filter((context) => Boolean(context.application)).length,
    experiences: contexts.filter((context) => Boolean(context.experience)).length,
  };
};

const ContextBadges = ({ contact }: { contact: ApplicationContact }) => {
  const { applications, experiences } = contextCounts(contact);
  if (!applications && !experiences) {
    return <span className="text-xs text-slate-400 dark:text-ink-500">Not linked</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {applications > 0 && (
        <span className="rounded-md bg-slate-100 dark:bg-ink-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-ink-200">
          {applications} {applications === 1 ? 'application' : 'applications'}
        </span>
      )}
      {experiences > 0 && (
        <span className="rounded-md bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
          {experiences} {experiences === 1 ? 'experience' : 'experiences'}
        </span>
      )}
    </span>
  );
};

const ContactList = ({ groups, groupMode, relationshipSummary, onSelect }: Props) => (
  <div className={groupMode === 'NONE' ? '' : 'space-y-6'}>
    {groups.map(([group, items]) => (
      <section key={group}>
        {groupMode !== 'NONE' && (
          <div className="mb-2 flex items-center justify-between gap-4 px-1">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-ink-500">
                {groupMode === 'COMPANY' ? 'Company' : 'Linked application'}
              </p>
              <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-ink-50">
                {group}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-ink-800 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-ink-400">
              {items.length} {items.length === 1 ? 'person' : 'people'}
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.7)]">
          <div
            className={`hidden items-center gap-5 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-ink-900/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-ink-500 sm:grid ${columnGrid}`}
            aria-hidden="true"
          >
            <span>Person</span>
            <span>Relationship</span>
            <span>Work</span>
            <span>Linked to</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.07]">
            {items.map((contact) => {
              const context = contact.contexts?.[0]?.summary;
              const relationship = relationshipSummary(contact);
              const company = contact.company || context?.company;
              // No fallback to context.role: that is the role you applied for, not theirs.
              const role = contact.job_title?.trim() || '';

              return (
                <button
                  key={contact.id}
                  type="button"
                  aria-label={`Open ${contact.name}`}
                  onClick={() => onSelect(contact)}
                  className={`group grid w-full grid-cols-1 items-center gap-3 px-4 py-4 text-left transition-colors duration-200 hover:bg-slate-50/80 active:bg-slate-100 sm:gap-5 sm:px-5 ${columnGrid}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 text-xs font-semibold tracking-wide text-slate-600 dark:text-ink-200 shadow-sm">
                      {contactInitials(contact.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-ink-50">
                          {contact.name}
                        </span>
                        {contact.possible_duplicate && (
                          <Tag color="orange" className="shrink-0">
                            Possible duplicate
                          </Tag>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-ink-400">
                        {contact.email || 'No email added'}
                      </span>
                    </span>
                  </span>

                  <span className="hidden min-w-0 sm:block">
                    <span
                      className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-medium ${relationshipTone(relationship)}`}
                    >
                      <span className="truncate">{relationship}</span>
                    </span>
                  </span>

                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-ink-50">
                      {company || 'Company not added'}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-ink-400">
                      {role || 'Role not added'}
                    </span>
                  </span>

                  <span className="hidden min-w-0 sm:block">
                    <ContextBadges contact={contact} />
                  </span>

                  <RightOutlined className="hidden text-[10px] text-slate-300 dark:text-ink-600 transition group-hover:translate-x-0.5 group-hover:text-slate-500 sm:block" />

                  <span className="grid min-w-0 grid-cols-2 gap-3 border-t border-slate-100 dark:border-white/[0.07] pt-3 sm:hidden">
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
                        Relationship
                      </span>
                      <span className="mt-1 block truncate text-xs font-medium text-slate-700 dark:text-ink-100">
                        {relationship}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
                        Work
                      </span>
                      <span className="mt-1 block truncate text-xs font-medium text-slate-700 dark:text-ink-100">
                        {company || 'Not added'}
                      </span>
                      {role && (
                        <span className="block truncate text-[11px] text-slate-500 dark:text-ink-400">
                          {role}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    ))}
  </div>
);

export default ContactList;
