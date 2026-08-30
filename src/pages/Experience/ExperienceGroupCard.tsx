import { Avatar, Tag } from 'antd';
import { BankOutlined, LinkOutlined, RiseOutlined, TeamOutlined } from '@ant-design/icons';
import RowActions from '../../components/RowActions';
import type { Experience } from '../../types';
import type { OfferLike as Offer } from '../OfferComparison/calculations';
import { getMediaUrl } from '../../lib/runtimeConfig';
import type { EmploymentType } from '../../types';
import { getAvatarStyle, parseExperienceDate } from './experienceUtils';

import { EmploymentBadge } from './ExperienceBadges';
import RoleMetaRow from './RoleMetaRow';
import RoleActionRow from './RoleActionRow';
import { gapLabelBetween, groupSpan, type RoleDateLabel } from './roleTimeline';
import {
  TimelineGapLabel,
  TimelineRailDesktop,
  TimelineRailMobile,
} from './ExperienceTimelineRail';
import { SortableGroupCard } from './SortableGroupCard';
import { LEVEL_BADGE_CLASS, STATUS_BADGE_CLASS } from './experienceBadgeClasses';
import type { ExperienceCompensationSnapshot } from './compensation';
import type { ReactNode } from 'react';

type Props = {
  group: Experience[];
  groupIdx: number;
  groupedExperiences: Experience[][];
  experiences: Experience[];
  empTypes: EmploymentType[];
  formatDuration: (exp: Experience) => RoleDateLabel;
  formatRoleDateRange: (exp: Experience, overrideEndDate?: string | null) => RoleDateLabel;
  getCompensationSnapshot: (exp: Experience) => ExperienceCompensationSnapshot | null;
  getGroupTenure: (group: Experience[]) => string;
  getLatestTeam: (exp: Experience) => { name: string } | null;
  getLinkedOffer: (exp: Experience) => Offer | undefined;
  handleDelete: (id: number) => void;
  handleDeleteGroup: (group: Experience[]) => void;
  handleDuplicateExperience: (exp: Experience) => void;
  handleRaiseHistoryClick: (exp: Experience) => void;
  handleToggleGroupLock: (group: Experience[]) => void;
  handleToggleLock: (exp: Experience) => void;
  handleTogglePin: (exp: Experience) => void;
  openEditModal: (exp: Experience) => void;
  renderDescription: (text: string) => ReactNode;
  setCompBreakdownExp: (exp: Experience) => void;
  setContactsExp: (exp: Experience) => void;
  setPromotionReviewExp: (exp: Experience) => void;
  setTeamHistoryExp: (exp: Experience) => void;
};

const ExperienceGroupCard = ({
  group,
  groupIdx,
  groupedExperiences,
  experiences,
  empTypes,
  formatDuration,
  formatRoleDateRange,
  getCompensationSnapshot,
  getGroupTenure,
  getLatestTeam,
  getLinkedOffer,
  handleDelete,
  handleDeleteGroup,
  handleDuplicateExperience,
  handleRaiseHistoryClick,
  handleToggleGroupLock,
  handleToggleLock,
  handleTogglePin,
  openEditModal,
  renderDescription,
  setCompBreakdownExp,
  setContactsExp,
  setPromotionReviewExp,
  setTeamHistoryExp,
}: Props) => {
  const primary = group[0];
  const isMulti = group.length > 1;
  const logoSrc = getMediaUrl(primary.logo);
  const span = groupSpan(group, parseExperienceDate);
  // Groups run newest first, so the company below this one is the earlier stint.
  const olderGroup = groupedExperiences[groupIdx + 1];
  const gapBelow = olderGroup
    ? gapLabelBetween(span, groupSpan(olderGroup, parseExperienceDate))
    : null;

  const groupAvatar = logoSrc ? (
    <Avatar
      size={52}
      src={logoSrc}
      className="shadow-md border-4 border-white ring-1 ring-gray-100 z-10"
    />
  ) : (
    <Avatar
      size={52}
      style={getAvatarStyle(primary.company)}
      className="font-bold text-xl shadow-md border-4 border-white ring-1 ring-gray-100 z-10"
    >
      {primary.company?.charAt(0)?.toUpperCase() || <BankOutlined />}
    </Avatar>
  );

  const renderSingleRole = (exp: Experience) => {
    const skills = exp.skills || [];
    const comp = getCompensationSnapshot(exp);
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex min-w-0 items-center gap-3 pr-24 md:hidden">
              {logoSrc ? (
                <Avatar size={40} src={logoSrc} className="shadow-sm" />
              ) : (
                <Avatar
                  size={40}
                  style={getAvatarStyle(exp.company)}
                  className="font-bold shadow-sm"
                >
                  {exp.company?.charAt(0)?.toUpperCase() || <BankOutlined />}
                </Avatar>
              )}
              <div className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                {exp.company}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="m-0 min-w-0 break-words text-[17px] font-semibold leading-snug tracking-[-0.015em] text-slate-950 transition-colors group-hover:text-blue-700 sm:text-[21px]">
                {exp.title}
              </h3>
              <EmploymentBadge type={exp.employment_type} empTypes={empTypes} />
              {exp.level && <span className={LEVEL_BADGE_CLASS}>{exp.level}</span>}
              {exp.is_return_offer && (
                <span
                  className={`${STATUS_BADGE_CLASS} border-blue-100 bg-blue-50/80 text-blue-700`}
                >
                  <LinkOutlined style={{ fontSize: 9 }} /> Return offer
                </span>
              )}
            </div>
            <div className="mt-0.5 hidden text-[15px] font-medium tracking-[-0.01em] text-slate-500 md:block">
              {exp.company}
            </div>
            <RoleMetaRow
              dates={formatDuration(exp)}
              location={exp.location}
              teamChip={exp.employment_type === 'internship' ? getLatestTeam(exp)?.name : null}
              comp={comp}
              employmentType={exp.employment_type}
              hourlyRate={exp.hourly_rate}
              onOpenBreakdown={() => setCompBreakdownExp(exp)}
              describedRole={`${exp.title} at ${exp.company}`}
            />
            {exp.employment_type !== 'internship' &&
              (() => {
                const team = getLatestTeam(exp);
                return team ? (
                  <div className="mt-2 flex items-start gap-1.5 text-sm font-medium text-gray-500">
                    <TeamOutlined className="mt-[3px] shrink-0 text-gray-400" />
                    <span className="min-w-0">{team.name}</span>
                  </div>
                ) : null;
              })()}
          </div>
          <RoleActionRow
            className="lg:mt-9"
            onPromotion={() => setPromotionReviewExp(exp)}
            onTeamNorms={() => setTeamHistoryExp(exp)}
            onContacts={() => setContactsExp(exp)}
            onRaiseHistory={getLinkedOffer(exp) ? () => handleRaiseHistoryClick(exp) : undefined}
            trailing={
              <RowActions
                onEdit={exp.is_locked ? undefined : () => openEditModal(exp)}
                onDuplicate={exp.is_locked ? undefined : () => handleDuplicateExperience(exp)}
                onDelete={exp.is_locked ? undefined : () => exp.id && handleDelete(exp.id)}
                deleteTitle="Delete Experience"
                deleteDescription="Are you sure you want to remove this role?"
                disableEdit={exp.is_locked}
                disableDelete={exp.is_locked}
              />
            }
          />
        </div>
        {/* Card chrome, not a fifth action: the cluster sits in the corner at every width. */}
        <div
          className={`absolute right-3 top-3 z-20 transition-opacity duration-200 sm:right-4 sm:top-4 ${
            exp.is_locked ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
          }`}
        >
          <RowActions
            isLocked={exp.is_locked}
            onToggleLock={() => handleToggleLock(exp)}
            disableLock={group.length > 1 && group.every((e) => e.is_locked)}
            lockTitle={
              group.length > 1 && group.every((e) => e.is_locked)
                ? 'Company is locked. Unlock company header to modify individual roles.'
                : exp.is_locked
                  ? 'Unlock role'
                  : 'Lock role'
            }
            isPinned={exp.is_pinned}
            onTogglePin={() => handleTogglePin(exp)}
          />
        </div>
        {exp.description && (
          <div className="mt-5 text-[15px] sm:mt-6">{renderDescription(exp.description)}</div>
        )}
        {skills.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Tag
                key={skill}
                className="m-0 px-3 py-1 rounded-md bg-[rgb(248,250,255)] text-blue-600 border border-blue-100/60 font-medium hover:bg-blue-50 transition-colors"
              >
                {skill}
              </Tag>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMultiRoles = () => {
    const tenure = getGroupTenure(group);
    return (
      <div className="p-4 sm:p-6">
        {/* The group's pin, lock-all and delete-unlocked live in the corner, like the single-role card. */}
        <div className="mb-5">
          {/* Only the name line clears the corner cluster, so the tenure never wraps. */}
          <div className="flex items-center gap-3 pr-36 md:pr-28">
            <div className="flex shrink-0 md:hidden">
              {logoSrc ? (
                <Avatar size={40} src={logoSrc} className="shadow-sm" />
              ) : (
                <Avatar
                  size={40}
                  style={getAvatarStyle(primary.company)}
                  className="font-bold shadow-sm"
                >
                  {primary.company?.charAt(0)?.toUpperCase()}
                </Avatar>
              )}
            </div>
            <div className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.015em] text-slate-950 sm:text-[19px]">
              {primary.company}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] leading-5">
            <span className="text-slate-500">{group.length} roles</span>
            {tenure && (
              <>
                <span className="text-slate-300">·</span>
                <span className="tabular-nums text-slate-400">{tenure} total</span>
              </>
            )}
          </div>
        </div>
        <div
          className={`absolute right-3 top-3 z-20 transition-opacity duration-200 sm:right-4 sm:top-4 ${
            primary.is_pinned || group.every((e) => e.is_locked)
              ? 'opacity-100'
              : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
          }`}
        >
          <RowActions
            isPinned={primary.is_pinned}
            onTogglePin={() => handleTogglePin(primary)}
            isLocked={group.every((e) => e.is_locked)}
            onToggleLock={() => handleToggleGroupLock(group)}
            lockTitle={group.some((e) => !e.is_locked) ? 'Lock all roles' : 'Unlock all roles'}
            onDelete={group.some((e) => !e.is_locked) ? () => handleDeleteGroup(group) : undefined}
            deleteTitle={`Delete unlocked ${primary.company} roles?`}
            deleteDescription={`This will delete ${group.filter((e) => !e.is_locked).length} unlocked role(s). Locked roles are kept.`}
            deleteButtonTooltip={`Delete ${group.filter((e) => !e.is_locked).length} unlocked role(s) at ${primary.company}`}
          />
        </div>

        {/* Roles — left-border timeline with dots */}
        <div className="relative pl-5 sm:pl-6" style={{ borderLeft: '2px solid #e5e7eb' }}>
          {group.map((exp, roleIdx) => {
            const skills = exp.skills || [];
            const comp = getCompensationSnapshot(exp);
            return (
              <div key={exp.id} className={`relative ${roleIdx < group.length - 1 ? 'mb-8' : ''}`}>
                {/* Timeline dot */}
                <div className="absolute -left-[29px] top-[5px] w-4 h-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                </div>
                {(() => {
                  const compGroup = experiences.filter((e) => e.company === exp.company);
                  const isGroupLocked = compGroup.length > 1 && compGroup.every((e) => e.is_locked);
                  return (
                    <div
                      className={`absolute right-0 top-0 z-20 transition-opacity duration-200 ${
                        exp.is_locked
                          ? 'opacity-100'
                          : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                      }`}
                    >
                      <RowActions
                        isLocked={exp.is_locked}
                        onToggleLock={() => handleToggleLock(exp)}
                        disableLock={isGroupLocked}
                        lockTitle={
                          isGroupLocked
                            ? 'Company is locked. Unlock company to modify individual roles.'
                            : exp.is_locked
                              ? 'Unlock role'
                              : 'Lock role'
                        }
                      />
                    </div>
                  );
                })()}

                <div className="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 pr-12 md:pr-9 lg:pr-0">
                      <span className="min-w-0 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-slate-950 sm:text-[17px]">
                        {exp.title}
                      </span>
                      {exp.is_promotion && (
                        <span
                          className={`${STATUS_BADGE_CLASS} border-emerald-100 bg-emerald-50/80 text-emerald-700`}
                        >
                          <RiseOutlined style={{ fontSize: 9 }} /> Promoted
                        </span>
                      )}
                      <EmploymentBadge type={exp.employment_type} empTypes={empTypes} />
                      {exp.level && <span className={LEVEL_BADGE_CLASS}>{exp.level}</span>}
                      {exp.is_return_offer && (
                        <span
                          className={`${STATUS_BADGE_CLASS} border-blue-100 bg-blue-50/80 text-blue-700`}
                        >
                          <LinkOutlined style={{ fontSize: 9 }} /> Return offer
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <RoleMetaRow
                        dates={formatRoleDateRange(
                          exp,
                          roleIdx > 0 ? group[roleIdx - 1].start_date : null
                        )}
                        location={exp.location}
                        teamChip={
                          exp.employment_type === 'internship' ? getLatestTeam(exp)?.name : null
                        }
                        comp={comp}
                        employmentType={exp.employment_type}
                        hourlyRate={exp.hourly_rate}
                        onOpenBreakdown={() => setCompBreakdownExp(exp)}
                        describedRole={`${exp.title} at ${exp.company}`}
                      />
                    </div>
                    {exp.employment_type !== 'internship' &&
                      (() => {
                        const team = getLatestTeam(exp);
                        return team ? (
                          <div className="mt-1 flex items-start gap-1.5 text-[15px] text-gray-500">
                            <TeamOutlined
                              className="mt-[4px] shrink-0"
                              style={{ fontSize: 12, color: '#9ca3af' }}
                            />
                            <span className="min-w-0">{team.name}</span>
                          </div>
                        ) : null;
                      })()}
                  </div>
                  <RoleActionRow
                    className="lg:ml-2 lg:mt-8"
                    onPromotion={() => setPromotionReviewExp(exp)}
                    onTeamNorms={() => setTeamHistoryExp(exp)}
                    onRaiseHistory={
                      getLinkedOffer(exp) ? () => handleRaiseHistoryClick(exp) : undefined
                    }
                    onLinkOffer={getLinkedOffer(exp) ? undefined : () => openEditModal(exp)}
                    trailing={
                      <RowActions
                        onEdit={exp.is_locked ? undefined : () => openEditModal(exp)}
                        onDuplicate={
                          exp.is_locked ? undefined : () => handleDuplicateExperience(exp)
                        }
                        onDelete={exp.is_locked ? undefined : () => exp.id && handleDelete(exp.id)}
                        deleteTitle="Delete Role"
                        deleteDescription="Are you sure you want to remove this role?"
                        disableEdit={exp.is_locked}
                        disableDelete={exp.is_locked}
                      />
                    }
                  />
                </div>

                {exp.description && (
                  <div className="mt-4 text-[15px]">{renderDescription(exp.description)}</div>
                )}
                {skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Tag
                        key={skill}
                        className="m-0 px-2.5 py-0.5 rounded-md bg-[rgb(248,250,255)] text-blue-600 border border-blue-100/60 font-medium text-sm hover:bg-blue-50 transition-colors"
                      >
                        {skill}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <SortableGroupCard key={primary.id || `group-${groupIdx}`} id={primary.id!}>
      <div
        key={`group-${groupIdx}`}
        className="group relative flex w-full flex-col gap-6 md:flex-row"
      >
        <TimelineRailMobile
          isFirst={groupIdx === 0}
          isLast={groupIdx === groupedExperiences.length - 1}
          isCurrent={span.isCurrent}
        />
        <TimelineRailDesktop
          avatar={groupAvatar}
          year={span.start ? span.start.format('YYYY') : undefined}
          isFirst={groupIdx === 0}
          isLast={groupIdx === groupedExperiences.length - 1}
          isCurrent={span.isCurrent}
        />
        {gapBelow && <TimelineGapLabel label={gapBelow} />}
        <div
          className={`relative min-w-0 flex-grow overflow-hidden rounded-2xl border bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 sm:rounded-3xl ${
            primary.is_pinned
              ? 'border-amber-200 ring-1 ring-amber-100 hover:border-amber-400 hover:shadow-amber-100/60 hover:shadow-lg'
              : 'border-gray-100 hover:border-blue-100 hover:shadow-md'
          }`}
        >
          <div
            className={`absolute top-0 left-0 w-2 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              primary.is_pinned
                ? 'bg-gradient-to-b from-amber-300 to-orange-400'
                : 'bg-gradient-to-b from-blue-300 to-sky-400'
            }`}
          />
          {isMulti ? renderMultiRoles() : renderSingleRole(group[0])}
        </div>
      </div>
    </SortableGroupCard>
  );
};

export default ExperienceGroupCard;
