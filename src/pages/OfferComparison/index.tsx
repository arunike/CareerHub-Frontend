import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { updateApplication } from '../../api';
import { PlusOutlined } from '@ant-design/icons';
import PageActionToolbar from '../../components/PageActionToolbar';
import { getCurrentYear } from '../../utils/yearFilter';
import { message, Select, Spin } from 'antd';
import { useOfferAdjustmentsPersistence } from './useOfferAdjustmentsPersistence';
import { usePersistedState } from '../../hooks/usePersistedState';
import CareerTransitionAdvisor from './CareerTransitionAdvisor';
import OfferDecisionScorecard from './OfferDecisionScorecard';
import { useDecisionSnapshots } from './useDecisionSnapshots';
import { useOfferEditor } from './useOfferEditor';
import { useOfferDialogs } from './useOfferDialogs';
import { useOfferMutations } from './useOfferMutations';
import { useOfferPageData } from './useOfferPageData';
import { useTransitionAdvisor } from './useTransitionAdvisor';
import { useScenarioDraft } from './useScenarioDraft';
import { buildChartData, buildCompareOptions } from './offerChartData';
import { useSharedDriving } from './useSharedDriving';
import CompBreakdownSection from './CompBreakdownSection';
import { useOfferComparisonRows } from './useOfferComparisonRows';
import { normalizeSimulatedOffers } from './simulatedOfferNormalize';
import { useScenarioApplications } from './useScenarioApplications';
import {
  OFFER_STATUS_FILTERS,
  type ApplicationLike as Application,
  type BenefitItem,
  type OfferStatusFilter,
} from './calculations';
import { useLocation, useNavigate } from 'react-router-dom';
import CommuteComparison from './CommuteComparison';
import DrivingAssumptions from './DrivingAssumptions';
import OfferModalStack from './OfferModalStack';

const CompensationSimulator = lazy(() => import('./CompensationSimulator'));

const LazySectionFallback = () => (
  <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
    <Spin size="large" />
  </div>
);

const normalizeBenefitItem = (item: Partial<BenefitItem>, fallbackId: string): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
  is_taxable: Boolean(item.is_taxable),
});

const OfferComparison = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const [compBreakdownView, setCompBreakdownView] = useState<'year1' | 'fourYear'>('year1');
  const [compBreakdownDisplay, setCompBreakdownDisplay] = useState<'list' | 'chart'>('chart');
  const [decisionOrderIds, setDecisionOrderIds] = useState<string[]>([]);

  const [isChartExpanded, setIsChartExpanded] = useState(true);

  const [selectedYear, setSelectedYear] = usePersistedState<number | 'all'>(
    'offersSelectedYear',
    getCurrentYear(),
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => (raw === 'all' ? 'all' : parseInt(raw)),
    }
  );
  const [statusFilter, setStatusFilter] = usePersistedState<OfferStatusFilter>(
    'offerComparisonStatusFilter',
    'all',
    {
      serialize: (value) => value,
      // An older build's value must not resurrect a filter that no longer exists.
      deserialize: (raw) =>
        OFFER_STATUS_FILTERS.includes(raw as OfferStatusFilter)
          ? (raw as OfferStatusFilter)
          : 'all',
    }
  );

  const {
    offers,
    setOffers,
    applications,
    setApplications,
    loading,
    allUsCityOptions,
    fetchData,
    getApplicationName,
    currentJobName,
    applicationsById,
    availableYears,
    rejectedOffersCount,
    pastOffersCount,
    filteredOffers,
    handleAddLoadedApplication,
  } = useOfferPageData({ messageApi, selectedYear, statusFilter });
  const [visibleOfferIds, setVisibleOfferIds] = useState<string[]>([]);
  const editor = useOfferEditor({ applications, setOffers, setApplications, messageApi });
  const { handleEditClick } = editor;
  const dialogs = useOfferDialogs();
  const { setNegotiatingOffer, setNegotiationLogOffer, setRaiseHistoryOffer, setSnapshotOffer } =
    dialogs;
  const {
    toggleCurrent,
    persistOfferUpdates,
    handleToggleRejected,
    handleDeleteOffer,
    handleSaveRaiseHistory,
    handleExportOffers,
  } = useOfferMutations({
    offers,
    applicationsById,
    setOffers,
    setApplications,
    setVisibleOfferIds,
    setDecisionOrderIds,
    dialogs,
    editor,
    refresh: fetchData,
    messageApi,
  });
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };
  const {
    maritalStatus,
    setMaritalStatus,
    simulatedOffers,
    setSimulatedOffers,
    isSettingsHydrated,
    saveAdjustments,
  } = useOfferAdjustmentsPersistence({ normalizeSimulatedOffers });

  const scenario = useScenarioDraft({ setSimulatedOffers, messageApi });
  const { drivingDefaults, saveDrivingDefaults, fuelOverrideTargets, applySharedDrivingToOffers } =
    useSharedDriving({
      offers,
      applications,
      setApplications,
      simulatedOffers,
      setSimulatedOffers,
      saveAdjustments,
      getApplicationName,
      messageApi,
    });
  const {
    isAdvisorExpanded,
    setIsAdvisorExpanded,
    selectedPainPoints,
    setSelectedPainPoints,
    customPainPoints,
    setCustomPainPoints,
    promotionTimeline,
    setPromotionTimeline,
    includeJobHunting,
    setIncludeJobHunting,
    isAdvisorLoading,
    advisorResult,
    advisorError,
    handleGetTransitionAdvice,
  } = useTransitionAdvisor(simulatedOffers);
  useScenarioApplications({
    isSettingsHydrated,
    simulatedOffers,
    applications,
    setApplications,
  });
  const handleSaveAdjustments = useCallback(() => {
    void saveAdjustments()
      .then(() => messageApi.success('Scenarios and adjustments saved'))
      .catch((error) => {
        console.error('Failed to save offer adjustments', error);
        messageApi.error('Could not save scenarios and adjustments');
      });
  }, [saveAdjustments, messageApi]);
  const {
    referenceLocation,
    maritalStatusOptions,
    effectiveMonthlyRent,
    referenceColIndex,
    adjustedByOfferId,
    displayOffers,
    displaySimulatedOffers,
    displayScenarioRows,
    decisionOrderById,
    cityCostOfLiving,
    stateColBase,
    stateTaxRate,
    stateNameToAbbr,
  } = useOfferComparisonRows({
    offers,
    applications,
    filteredOffers,
    simulatedOffers,
    visibleOfferIds,
    decisionOrderIds,
    getApplicationName,
    maritalStatus,
    isSettingsHydrated,
    drivingDefaults,
  });
  const { handleSaveDecisionSnapshot, handleRestoreDecisionSnapshot } = useDecisionSnapshots({
    offers,
    setOffers,
    setApplications,
    setSnapshotOffer,
    applicationsById,
    adjustedByOfferId,
    maritalStatus,
    referenceLocation,
    messageApi,
  });
  const {
    setIsAddScenarioOpen,
    setEditingScenarioId,
    setScenarioModalMode,
    setScenarioBenefitItems,
    setNewScenario,
    resetScenarioDraft,
  } = scenario;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'scenario') {
      setScenarioModalMode('add');
      setEditingScenarioId(null);
      setIsAddScenarioOpen(true);
    } else {
      return;
    }
    navigate('/offers', { replace: true });
  }, [location.search, navigate, setEditingScenarioId, setIsAddScenarioOpen, setScenarioModalMode]);

  const chartData = buildChartData({
    displayOffers,
    displaySimulatedOffers,
    decisionOrderById,
    getApplicationName,
  });

  const compareOptions = buildCompareOptions({
    filteredOffers,
    simulatedOffers,
    getApplicationName,
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading offers...</div>;

  return (
    <div className="space-y-6">
      {contextHolder}
      <PageActionToolbar
        title="Offer Comparison"
        subtitle="Compare total compensation across your offers, in year 1 and over four years."
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        availableYears={availableYears}
        onExport={handleExportOffers}
        exportFilename="offers"
        primaryActionIcon={<PlusOutlined />}
        singleRowDesktop
      />

      <CompBreakdownSection
        chartData={chartData}
        compBreakdownDisplay={compBreakdownDisplay}
        compBreakdownView={compBreakdownView}
        displayScenarioRows={displayScenarioRows}
        isChartExpanded={isChartExpanded}
        setCompBreakdownDisplay={setCompBreakdownDisplay}
        setCompBreakdownView={setCompBreakdownView}
        setIsChartExpanded={setIsChartExpanded}
      />

      {/* Nothing to compare when every offer is remote, so skip the empty card. */}
      {displayScenarioRows.some((row) => row.commute?.primary) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Commute</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Travel time and cost across offers, weighted by each one&apos;s RTO policy
              </p>
            </div>
            <DrivingAssumptions
              value={drivingDefaults}
              onChange={saveDrivingDefaults}
              overrides={fuelOverrideTargets}
              onApplyToOffers={applySharedDrivingToOffers}
            />
          </div>
          <CommuteComparison scenarioRows={displayScenarioRows} drivingDefaults={drivingDefaults} />
        </section>
      )}

      <OfferDecisionScorecard
        extraHeaderNode={
          <Select
            mode="multiple"
            placeholder="Compare specific offers..."
            value={visibleOfferIds}
            onChange={setVisibleOfferIds}
            style={{ minWidth: 280, maxWidth: 450 }}
            maxTagCount="responsive"
            allowClear
            options={compareOptions}
          />
        }
        filteredOffers={displayOffers}
        applicationsById={applicationsById}
        adjustedByOfferId={adjustedByOfferId}
        simulatedOffers={displaySimulatedOffers}
        scenarioRows={displayScenarioRows}
        maritalStatus={maritalStatus}
        setMaritalStatus={setMaritalStatus}
        maritalStatusOptions={maritalStatusOptions}
        saveAdjustments={handleSaveAdjustments}
        onEditScenario={(id) => {
          const target = simulatedOffers.find((offer) => String(offer.id) === id);
          if (!target) return;
          setScenarioModalMode('edit');
          setEditingScenarioId(id);
          setNewScenario({ ...target });
          const benefitItems =
            Array.isArray(target.benefit_items) && target.benefit_items.length > 0
              ? target.benefit_items.map((item, idx) =>
                  normalizeBenefitItem(item, `scenario-benefit-${Date.now()}-${idx}`)
                )
              : [
                  {
                    id: `scenario-benefit-${Date.now()}`,
                    label: 'Benefits',
                    amount: Number(target.benefits_value || 0),
                    frequency: 'YEARLY' as const,
                  },
                ];
          setScenarioBenefitItems(benefitItems);
          setIsAddScenarioOpen(true);
        }}
        onDeleteScenario={(id) => {
          setSimulatedOffers((prev) => prev.filter((offer) => String(offer.id) !== id));
        }}
        onAddScenario={() => {
          resetScenarioDraft();
          setScenarioModalMode('add');
          setIsAddScenarioOpen(true);
        }}
        onDecisionOrderChange={(orderedIds) => {
          setDecisionOrderIds((current) =>
            current.length === orderedIds.length &&
            current.every((id, index) => id === orderedIds[index])
              ? current
              : orderedIds
          );
        }}
        onScoreUpdate={async (appId, patch) => {
          try {
            const response = await updateApplication(appId, patch);
            const updatedApplication = response.data as Partial<Application> & {
              company_details?: { name?: string };
            };
            setApplications((prev) =>
              prev.map((app) => {
                if (app.id !== appId) {
                  return app;
                }

                return {
                  ...app,
                  ...patch,
                  ...updatedApplication,
                  company_name:
                    updatedApplication.company_details?.name ||
                    updatedApplication.company_name ||
                    app.company_name,
                };
              })
            );
            messageApi.success('Score updated');
          } catch (error) {
            messageApi.error('Failed to update score');
            console.error(error);
          }
        }}
        offers={offers}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        rejectedOffersCount={rejectedOffersCount}
        pastOffersCount={pastOffersCount}
        onEditClick={handleEditClick}
        onToggleCurrent={toggleCurrent}
        onToggleRejected={handleToggleRejected}
        onNegotiateClick={setNegotiatingOffer}
        onNegotiationLogClick={setNegotiationLogOffer}
        onRaiseHistoryClick={setRaiseHistoryOffer}
        onSaveSnapshotClick={handleSaveDecisionSnapshot}
        onSnapshotsClick={(offer) => {
          setSnapshotOffer(offer);
        }}
        onDeleteClick={handleDeleteOffer}
      />

      {/* Career Transition Advisor */}
      <CareerTransitionAdvisor
        isAdvisorExpanded={isAdvisorExpanded}
        setIsAdvisorExpanded={setIsAdvisorExpanded}
        selectedPainPoints={selectedPainPoints}
        setSelectedPainPoints={setSelectedPainPoints}
        customPainPoints={customPainPoints}
        setCustomPainPoints={setCustomPainPoints}
        promotionTimeline={promotionTimeline}
        setPromotionTimeline={setPromotionTimeline}
        includeJobHunting={includeJobHunting}
        setIncludeJobHunting={setIncludeJobHunting}
        isAdvisorLoading={isAdvisorLoading}
        advisorResult={advisorResult}
        advisorError={advisorError}
        handleGetTransitionAdvice={handleGetTransitionAdvice}
        currentJobName={currentJobName}
      />

      <Suspense fallback={<LazySectionFallback />}>
        <CompensationSimulator scenarioRows={displayScenarioRows} />
      </Suspense>

      <OfferModalStack
        editor={editor}
        dialogs={dialogs}
        scenario={scenario}
        adjustedByOfferId={adjustedByOfferId}
        allUsCityOptions={allUsCityOptions}
        applications={applications}
        applicationsById={applicationsById}
        cityCostOfLiving={cityCostOfLiving}
        drivingDefaults={drivingDefaults}
        effectiveMonthlyRent={effectiveMonthlyRent}
        getApplicationName={getApplicationName}
        handleAddLoadedApplication={handleAddLoadedApplication}
        handleSaveRaiseHistory={handleSaveRaiseHistory}
        maritalStatus={maritalStatus}
        persistOfferUpdates={persistOfferUpdates}
        referenceColIndex={referenceColIndex}
        referenceLocation={referenceLocation}
        stateColBase={stateColBase}
        stateNameToAbbr={stateNameToAbbr}
        stateTaxRate={stateTaxRate}
        handleRestoreDecisionSnapshot={handleRestoreDecisionSnapshot}
      />
    </div>
  );
};

export default OfferComparison;
