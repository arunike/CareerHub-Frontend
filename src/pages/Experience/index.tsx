import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { buildEarningsReport } from './earningsByYear';
import { useLedgerEarnings } from '../Income/useLedgerEarnings';
import { buildInternshipParts } from './internshipParts';
import { Button, Typography, Upload } from 'antd';
import Modal from '../../components/MobileModal';
import { PlusOutlined, RobotOutlined, UserOutlined, InboxOutlined } from '@ant-design/icons';
import { MetricCardsSkeleton, ListSkeleton } from '../../components/SkeletonLoader';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Experience } from '../../types';
import ExperienceModal from './ExperienceModal';
import JDMatcherModal from './JDMatcherModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState } from '../../components/PageState';
import RaiseHistoryModal from '../OfferComparison/RaiseHistoryModal';
import TeamHistoryModal from './TeamHistoryModal';
import ContactsPanel from '../../components/ContactsPanel';
import SchedulePhasesModal from './SchedulePhasesModal';
import CompensationBreakdownModal from './CompensationBreakdownModal';
import PayGrowthModal from './PayGrowthModal';
import PromotionReviewModal from './PromotionReviewModal';
import type { OfferLike as Offer } from '../OfferComparison/calculations';
import { getExperienceCompensationSnapshot } from './compensation';
import ExperienceAnalyticsPanels from './ExperienceAnalyticsPanels';
import ExperienceGroupCard from './ExperienceGroupCard';
import { useExperienceData } from './useExperienceData';
import { buildOfferSelectOptions } from './offerSelectOptions';
import { renderExperienceDescription as renderDescription } from './renderExperienceDescription';
import {
  formatDuration,
  formatRoleDateRange,
  getGroupTenure,
  getLatestTeam,
  getTypeDisplay,
} from './experienceDisplay';
import {
  companiesByEmploymentType,
  companyCount,
  durationByEmploymentType,
  fmtDays,
  skillFrequency,
  topSkillsByFrequency,
  totalCareerDuration,
} from './experienceSummaries';
import { useLocation, useNavigate } from 'react-router-dom';
import { groupExperiencesByCompany, sortExperiencesForDisplay } from './experienceUtils';
import { useExperienceCompSummaries } from './useExperienceCompSummaries';
import { useExperienceMutations } from './useExperienceMutations';
import { useExperienceDragOrder } from './useExperienceDragOrder';

const { Text } = Typography;
const { Dragger } = Upload;

const ExperiencePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    experiences,
    setExperiences,
    loading,
    loadError,
    empTypes,
    allOffers,
    fetchExperiences,
    fetchOffersData,
    setAllOffers,
    maybeRefineSkillsWithAI,
    handleDelete,
    handleDeleteAll,
    handleDeleteGroup,
    handleToggleLock,
    handleToggleGroupLock,
    handleTogglePin,
  } = useExperienceData();
  const [modalOpen, setModalOpen] = useState(false);

  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [raiseHistoryExp, setRaiseHistoryExp] = useState<Experience | null>(null);
  const [teamHistoryExp, setTeamHistoryExp] = useState<Experience | null>(null);
  const [contactsExp, setContactsExp] = useState<Experience | null>(null);
  const [schedulePhasesExp, setSchedulePhasesExp] = useState<Experience | null>(null);
  const [compBreakdownExp, setCompBreakdownExp] = useState<Experience | null>(null);
  const [overallCompBreakdownOpen, setOverallCompBreakdownOpen] = useState(false);
  const [overallInternshipBreakdownOpen, setOverallInternshipBreakdownOpen] = useState(false);
  const [payGrowthOpen, setPayGrowthOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [promotionReviewExp, setPromotionReviewExp] = useState<Experience | null>(null);

  const getLinkedOffer = (exp: Experience): Offer | undefined =>
    exp.offer ? allOffers.find((o) => o.id === exp.offer) : undefined;

  const { ledgerByRole } = useLedgerEarnings(
    allOffers as unknown as Array<Record<string, unknown>>,
    experiences as unknown as Array<Record<string, unknown>>
  );

  const getCompensationSnapshot = useCallback(
    (exp: Experience) => {
      const linkedOffer = exp.offer ? allOffers.find((offer) => offer.id === exp.offer) : undefined;
      const snapshot = getExperienceCompensationSnapshot(exp, linkedOffer);
      // The ledger counts real paychecks, so it replaces the rate-and-days estimate where it exists.
      const ledger = ledgerByRole.get(`experience-${exp.id}`);
      if (snapshot?.kind === 'salary' && ledger?.length)
        return { ...snapshot, ledgerYears: ledger };
      return snapshot;
    },
    [allOffers, ledgerByRole]
  );

  const {
    handleCreateOrUpdate,
    handleExportWrapper,
    importProps,
    handleSaveRaiseHistory,
    handleRaiseHistoryClick,
    handleSaveTeamHistory,
    handleSaveSchedulePhases,
    handleSaveInternshipCompInputs,
  } = useExperienceMutations({
    experiences,
    allOffers,
    setAllOffers,
    setExperiences,
    fetchExperiences,
    fetchOffersData,
    maybeRefineSkillsWithAI,
    getLinkedOffer,
    setIsImportModalOpen,
    setModalOpen,
    setEditingExp,
    setRaiseHistoryExp,
    setTeamHistoryExp,
    setSchedulePhasesExp,
    setCompBreakdownExp,
    raiseHistoryExp,
    teamHistoryExp,
    schedulePhasesExp,
    compBreakdownExp,
    editingExp,
    setContactsExp,
  });

  const openAddModal = useCallback(() => {
    setEditingExp(null);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'create') {
      openAddModal();
    } else if (action === 'import') {
      setIsImportModalOpen(true);
    } else {
      return;
    }
    navigate('/experience', { replace: true });
  }, [location.search, navigate, openAddModal]);

  const openEditModal = (exp: Experience) => {
    setEditingExp(exp);
    setModalOpen(true);
  };

  const handleDuplicateExperience = (exp: Experience) => {
    setEditingExp({
      ...exp,
      id: undefined,
      title: `${exp.title} (Copy)`,
    });
    setModalOpen(true);
  };

  const handleEditFromCompBreakdown = () => {
    if (!compBreakdownExp || compBreakdownExp.is_locked) return;
    const exp = compBreakdownExp;
    setCompBreakdownExp(null);
    openEditModal(exp);
  };

  const offerSelectOptions = useMemo(() => buildOfferSelectOptions(allOffers), [allOffers]);

  const calculateTotalCareerDuration = () => totalCareerDuration(experiences);
  const totalCompanies = companyCount(experiences);
  const durationByType = useMemo(() => durationByEmploymentType(experiences), [experiences]);
  const companiesByType = useMemo(() => companiesByEmploymentType(experiences), [experiences]);
  const fmtMonths = fmtDays;
  const skillCounts = useMemo(() => skillFrequency(experiences), [experiences]);
  const topSkills = useMemo(() => topSkillsByFrequency(skillCounts), [skillCounts]);

  const filteredExperiences = selectedSkill
    ? experiences.filter((exp) => exp.skills?.includes(selectedSkill))
    : experiences;

  const compBreakdownSnapshot = compBreakdownExp ? getCompensationSnapshot(compBreakdownExp) : null;

  // Internship pay splits by role the same way full-time pay does.
  const internshipParts = useMemo(
    () =>
      buildInternshipParts(
        experiences
          .filter((exp) => exp.employment_type === 'internship')
          .flatMap((exp) => {
            const snapshot = getCompensationSnapshot(exp);
            if (snapshot?.kind !== 'hourly') return [];
            return [
              {
                key: String(exp.id),
                company: exp.company || 'Role',
                roleTitle: exp.title || '',
                regularPay: snapshot.regularPay,
                overtimePay: snapshot.overtimePay,
              },
            ];
          })
      ),
    [experiences, getCompensationSnapshot]
  );

  // Rates cannot be summed across years; what was actually earned in each one can.
  const fullTimeEarnings = useMemo(
    () =>
      buildEarningsReport(
        experiences.filter((exp) => exp.employment_type === 'full_time'),
        getLinkedOffer,
        getCompensationSnapshot,
        dayjs().format('YYYY-MM-DD')
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [experiences, allOffers, getCompensationSnapshot]
  );
  const {
    fullTimeCompSummary,
    internshipCompSnapshots,
    internshipCompSummary,
    payGrowth,
    payGrowthHeadline,
  } = useExperienceCompSummaries({ experiences, getCompensationSnapshot });

  const groupedExperiences: Experience[][] = groupExperiencesByCompany(
    sortExperiencesForDisplay(filteredExperiences)
  );

  const { sensors, handleDragEnd } = useExperienceDragOrder({
    groupedExperiences,
    setExperiences,
    fetchExperiences,
  });

  return (
    <div style={{ padding: 0, width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <PageActionToolbar
          title={<span className="whitespace-nowrap">Career History</span>}
          subtitle="Roles, skills, compensation, and achievements over time."
          extraActions={
            <Button
              size="large"
              icon={<RobotOutlined />}
              onClick={() => setJdModalOpen(true)}
              className="toolbar-btn text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300 shadow-sm"
            >
              Match JD
            </Button>
          }
          onDeleteAll={handleDeleteAll}
          deleteAllLabel="Delete All"
          deleteAllDisabled={!experiences.some((exp) => !exp.is_locked)}
          deleteAllConfirmTitle="Delete all experiences?"
          deleteAllConfirmDescription="This will permanently delete all unlocked experiences."
          onExport={handleExportWrapper}
          exportFilename="experiences"
          onImport={() => setIsImportModalOpen(true)}
          onPrimaryAction={openAddModal}
          primaryActionLabel="Add Experience"
          primaryActionIcon={<PlusOutlined />}
        />
      </div>

      {/* Analytics Dashboard */}
      {experiences.length > 0 && (
        <ExperienceAnalyticsPanels
          calculateTotalCareerDuration={calculateTotalCareerDuration}
          companiesByType={companiesByType}
          durationByType={durationByType}
          fmtMonths={fmtMonths}
          fullTimeCompSummary={fullTimeCompSummary}
          getTypeDisplay={(value: string) => getTypeDisplay(value, empTypes)}
          internshipCompSummary={internshipCompSummary}
          payGrowth={payGrowth}
          payGrowthHeadline={payGrowthHeadline}
          selectedSkill={selectedSkill}
          setOverallCompBreakdownOpen={setOverallCompBreakdownOpen}
          setOverallInternshipBreakdownOpen={setOverallInternshipBreakdownOpen}
          setPayGrowthOpen={setPayGrowthOpen}
          setSelectedSkill={setSelectedSkill}
          skillCounts={skillCounts}
          topSkills={topSkills}
          totalCompanies={totalCompanies}
        />
      )}

      {loading ? (
        <div className="space-y-6">
          <MetricCardsSkeleton count={4} />
          <ListSkeleton count={3} />
        </div>
      ) : loadError && experiences.length === 0 ? (
        <PageState
          tone="error"
          title="Career history could not be loaded"
          description="Your saved experience was not changed. Check your connection and try again."
          actionLabel="Retry loading career history"
          onAction={() => void fetchExperiences()}
          icon={<InboxOutlined />}
        />
      ) : experiences.length === 0 ? (
        <PageState
          title="No career history yet"
          description="Add a role or import your resume to keep positions, skills, compensation, and achievements together."
          actionLabel="Add experience"
          onAction={openAddModal}
          icon={<InboxOutlined />}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={groupedExperiences.map((g) => g[0].id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="relative pl-6 md:pl-8">
              <div className="space-y-10 relative z-10">
                {filteredExperiences.length === 0 && selectedSkill && (
                  <div className="text-center px-4 py-10 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                    <Text className="text-gray-500">
                      No timeline events match the selected skill filter.
                    </Text>
                    <div className="mt-2">
                      <Button type="link" onClick={() => setSelectedSkill(null)}>
                        Clear Filter
                      </Button>
                    </div>
                  </div>
                )}
                {groupedExperiences.map((group, groupIdx) => (
                  <ExperienceGroupCard
                    key={group[0].id ?? `group-${groupIdx}`}
                    group={group}
                    groupIdx={groupIdx}
                    groupedExperiences={groupedExperiences}
                    experiences={experiences}
                    empTypes={empTypes}
                    formatDuration={formatDuration}
                    formatRoleDateRange={formatRoleDateRange}
                    getCompensationSnapshot={getCompensationSnapshot}
                    getGroupTenure={getGroupTenure}
                    getLatestTeam={(exp) => getLatestTeam(exp) ?? null}
                    getLinkedOffer={getLinkedOffer}
                    handleDelete={handleDelete}
                    handleDeleteGroup={handleDeleteGroup}
                    handleDuplicateExperience={handleDuplicateExperience}
                    handleRaiseHistoryClick={handleRaiseHistoryClick}
                    handleToggleGroupLock={handleToggleGroupLock}
                    handleToggleLock={handleToggleLock}
                    handleTogglePin={handleTogglePin}
                    openEditModal={openEditModal}
                    renderDescription={renderDescription}
                    setCompBreakdownExp={setCompBreakdownExp}
                    setContactsExp={setContactsExp}
                    setPromotionReviewExp={setPromotionReviewExp}
                    setTeamHistoryExp={setTeamHistoryExp}
                  />
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {raiseHistoryExp && getLinkedOffer(raiseHistoryExp) && (
        <RaiseHistoryModal
          open={!!raiseHistoryExp}
          onClose={() => setRaiseHistoryExp(null)}
          offer={getLinkedOffer(raiseHistoryExp)!}
          companyName={raiseHistoryExp.company}
          roleTitle={raiseHistoryExp.title}
          onSave={handleSaveRaiseHistory}
        />
      )}

      {contactsExp && (
        <Modal
          open={!!contactsExp}
          onCancel={() => setContactsExp(null)}
          width={640}
          footer={null}
          title={
            <div className="flex items-center gap-2">
              <UserOutlined className="text-slate-500" />
              <span>
                Contacts
                <span className="ml-2 font-normal text-slate-500">
                  {contactsExp.title} @ {contactsExp.company}
                </span>
              </span>
            </div>
          }
        >
          <ContactsPanel
            experienceId={contactsExp.id!}
            description="People you worked with here, plus anyone recorded on the application that led to this role."
          />
        </Modal>
      )}

      {teamHistoryExp && (
        <TeamHistoryModal
          open={!!teamHistoryExp}
          onClose={() => setTeamHistoryExp(null)}
          experienceName={`${teamHistoryExp.title} @ ${teamHistoryExp.company}`}
          entries={teamHistoryExp.team_history || []}
          onSave={handleSaveTeamHistory}
          isIntern={teamHistoryExp.employment_type === 'internship'}
          expStartDate={teamHistoryExp.start_date}
          expEndDate={teamHistoryExp.end_date}
          expIsCurrent={teamHistoryExp.is_current}
        />
      )}

      {schedulePhasesExp && (
        <SchedulePhasesModal
          open={!!schedulePhasesExp}
          onClose={() => setSchedulePhasesExp(null)}
          experienceName={`${schedulePhasesExp.title} @ ${schedulePhasesExp.company}`}
          phases={schedulePhasesExp.schedule_phases || []}
          onSave={handleSaveSchedulePhases}
          expStartDate={schedulePhasesExp.start_date}
          expEndDate={schedulePhasesExp.end_date}
          expIsCurrent={schedulePhasesExp.is_current}
          expHourlyRate={schedulePhasesExp.hourly_rate}
          expHoursPerDay={schedulePhasesExp.hours_per_day}
          expWorkingDaysPerWeek={schedulePhasesExp.working_days_per_week}
          expOvertimeRate={schedulePhasesExp.overtime_rate}
          expOvertimeMultiplier={schedulePhasesExp.overtime_multiplier}
        />
      )}

      {compBreakdownExp && compBreakdownSnapshot && (
        <CompensationBreakdownModal
          open={!!compBreakdownExp}
          onClose={() => setCompBreakdownExp(null)}
          companyName={compBreakdownExp.company}
          roleTitle={compBreakdownExp.title}
          onEdit={
            compBreakdownExp.employment_type === 'internship' || compBreakdownExp.is_locked
              ? undefined
              : handleEditFromCompBreakdown
          }
          editLabel="Edit role"
          hourlyStartDate={compBreakdownExp.start_date}
          hourlyEndDate={compBreakdownExp.end_date}
          hourlyIsCurrent={compBreakdownExp.is_current}
          onSaveHourlyInputs={
            compBreakdownExp.employment_type === 'internship' && !compBreakdownExp.is_locked
              ? handleSaveInternshipCompInputs
              : undefined
          }
          openSchedulePhases={() => {
            setSchedulePhasesExp(compBreakdownExp);
          }}
          {...compBreakdownSnapshot}
        />
      )}

      {overallCompBreakdownOpen && fullTimeCompSummary.trackedRoleCount > 0 && (
        <CompensationBreakdownModal
          open={overallCompBreakdownOpen}
          onClose={() => setOverallCompBreakdownOpen(false)}
          titleText="Overall Full-Time Pay Breakdown"
          contextLabel={`Across ${fullTimeCompSummary.trackedRoleCount} full-time role${fullTimeCompSummary.trackedRoleCount !== 1 ? 's' : ''}`}
          overallEarnings={fullTimeEarnings}
          kind="salary"
          total={fullTimeCompSummary.total}
          base={fullTimeCompSummary.base}
          bonus={fullTimeCompSummary.bonus}
          equity={fullTimeCompSummary.equity}
        />
      )}

      {payGrowthOpen && (
        <PayGrowthModal
          open={payGrowthOpen}
          onClose={() => setPayGrowthOpen(false)}
          summary={payGrowth}
          getSnapshot={getCompensationSnapshot}
        />
      )}

      {overallInternshipBreakdownOpen &&
        internshipCompSummary.trackedRoleCount > 0 &&
        (() => {
          const aggHours = internshipCompSnapshots.reduce((sum, s) => sum + s.estimatedHours, 0);
          const aggOTHours = internshipCompSnapshots.reduce((sum, s) => sum + s.overtimeHours, 0);
          return (
            <CompensationBreakdownModal
              open={overallInternshipBreakdownOpen}
              onClose={() => setOverallInternshipBreakdownOpen(false)}
              titleText="Overall Internship Earnings Breakdown"
              contextLabel={`Across ${internshipCompSummary.trackedRoleCount} internship role${internshipCompSummary.trackedRoleCount !== 1 ? 's' : ''}`}
              totalLabel="Combined Internship Earnings"
              totalHint="Sum of all tracked internship earnings across roles."
              kind="hourly"
              overallInternship={{
                parts: internshipParts,
                roleCount: internshipCompSummary.trackedRoleCount,
                hours: aggHours,
              }}
              total={internshipCompSummary.total}
              regularPay={internshipCompSummary.regularPay}
              overtimePay={internshipCompSummary.overtimePay}
              estimatedHours={aggHours}
              hourlyRate={aggHours > 0 ? internshipCompSummary.total / aggHours : 0}
              hoursPerDay={8}
              workingDaysPerWeek={5}
              totalHoursWorked={null}
              overtimeHours={aggOTHours}
              overtimeRate={null}
              overtimeMultiplier={1.5}
              effectiveOvertimeRate={0}
              autoCalculatedHours={aggHours}
              weekdaysWorked={0}
              calculationMode="manual_hours"
              dateRangeLabel={`${internshipCompSnapshots.length} roles combined`}
              totalEarningsOverride={null}
              isMultiPhase={false}
              hourlyDisplayMode="aggregate"
            />
          );
        })()}

      <ExperienceModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSave={handleCreateOrUpdate}
        experience={editingExp}
        experiences={experiences}
        employmentTypes={empTypes}
        offers={offerSelectOptions}
      />

      <JDMatcherModal open={jdModalOpen} onCancel={() => setJdModalOpen(false)} />

      <PromotionReviewModal
        open={!!promotionReviewExp}
        experience={promotionReviewExp}
        onClose={() => setPromotionReviewExp(null)}
      />

      <Modal
        title="Import Experiences"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Dragger {...importProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag an export file here to import everything back
          </p>
          <p className="ant-upload-hint">
            Supports JSON, CSV, and XLSX. JSON is best for the most complete round-trip, including
            logos, linked offer snapshots, team history, and schedule phases.
          </p>
        </Dragger>
      </Modal>
    </div>
  );
};

export default ExperiencePage;
