import { lazy, Suspense } from 'react';
import type { useOfferEditor } from './useOfferEditor';
import type { useOfferDialogs } from './useOfferDialogs';
import type { useScenarioDraft } from './useScenarioDraft';

const ScenarioOfferModal = lazy(() => import('./ScenarioOfferModal'));
const EditOfferModal = lazy(() => import('./EditOfferModal'));
const NegotiationAdvisorModal = lazy(() => import('./NegotiationAdvisorModal'));
const NegotiationLogModal = lazy(() => import('./NegotiationLogModal'));
const RaiseHistoryModal = lazy(() => import('./RaiseHistoryModal'));
const OfferDecisionSnapshotsModal = lazy(() => import('./OfferDecisionSnapshotsModal'));

type Props = {
  editor: ReturnType<typeof useOfferEditor>;
  dialogs: ReturnType<typeof useOfferDialogs>;
  scenario: ReturnType<typeof useScenarioDraft>;
  adjustedByOfferId: any;
  allUsCityOptions: any;
  applications: any;
  applicationsById: any;
  cityCostOfLiving: any;
  drivingDefaults: any;
  effectiveMonthlyRent: any;
  getApplicationName: any;
  handleAddLoadedApplication: any;
  handleSaveRaiseHistory: any;
  maritalStatus: any;
  persistOfferUpdates: any;
  referenceColIndex: any;
  referenceLocation: any;
  stateColBase: any;
  stateNameToAbbr: any;
  stateTaxRate: any;
  handleRestoreDecisionSnapshot: any;
};

const OfferModalStack = ({
  editor,
  dialogs,
  scenario,
  adjustedByOfferId,
  allUsCityOptions,
  applications,
  applicationsById,
  cityCostOfLiving,
  drivingDefaults,
  effectiveMonthlyRent,
  getApplicationName,
  handleAddLoadedApplication,
  handleSaveRaiseHistory,
  maritalStatus,
  persistOfferUpdates,
  referenceColIndex,
  referenceLocation,
  stateColBase,
  stateNameToAbbr,
  stateTaxRate,
  handleRestoreDecisionSnapshot,
}: Props) => {
  const {
    editingOffer,
    setEditingOffer,
    setEditingOfferField,
    editingApp,
    patchEditingApp,
    editingBenefitItems,
    offerModalMode,
    setOfferModalMode,
    handleSaveEdit,
    addEditingBenefitItem,
    updateEditingBenefitItem,
    removeEditingBenefitItem,
  } = editor;
  const {
    negotiatingOffer,
    setNegotiatingOffer,
    negotiationLogOffer,
    setNegotiationLogOffer,
    raiseHistoryOffer,
    setRaiseHistoryOffer,
    snapshotOffer,
    setSnapshotOffer,
  } = dialogs;
  const {
    isAddScenarioOpen,
    setIsAddScenarioOpen,
    editingScenarioId,
    scenarioModalMode,
    scenarioBenefitItems,
    newScenario,
    setNewScenario,
    patchNewScenario,
    setNewScenarioField,
    customFormTaxPreview,
    resetScenarioDraft,
    addScenarioBenefitItem,
    updateScenarioBenefitItem,
    removeScenarioBenefitItem,
    addScenarioOffer,
  } = scenario;

  return (
    <>
      {editingOffer ? (
        <Suspense fallback={null}>
          <EditOfferModal
            drivingDefaults={drivingDefaults}
            editingOffer={editingOffer}
            editingApp={editingApp}
            offerModalMode={offerModalMode}
            allUsCityOptions={allUsCityOptions}
            adjustedByOfferId={adjustedByOfferId}
            editingBenefitItems={editingBenefitItems}
            patchEditingApp={patchEditingApp}
            setEditingOfferField={setEditingOfferField}
            addEditingBenefitItem={addEditingBenefitItem}
            updateEditingBenefitItem={updateEditingBenefitItem}
            removeEditingBenefitItem={removeEditingBenefitItem}
            onClose={() => {
              setEditingOffer(null);
              setOfferModalMode('edit');
            }}
            onSave={handleSaveEdit}
          />
        </Suspense>
      ) : null}

      {raiseHistoryOffer && (
        <Suspense fallback={null}>
          <RaiseHistoryModal
            open={!!raiseHistoryOffer}
            onClose={() => setRaiseHistoryOffer(null)}
            offer={raiseHistoryOffer}
            companyName={
              applicationsById[raiseHistoryOffer.application]?.company_name ?? 'Current Job'
            }
            roleTitle={applicationsById[raiseHistoryOffer.application]?.role_title ?? ''}
            onSave={handleSaveRaiseHistory}
          />
        </Suspense>
      )}

      {snapshotOffer && (
        <Suspense fallback={null}>
          <OfferDecisionSnapshotsModal
            open={!!snapshotOffer}
            offer={snapshotOffer}
            onRestoreSnapshot={handleRestoreDecisionSnapshot}
            onClose={() => {
              setSnapshotOffer(null);
            }}
          />
        </Suspense>
      )}

      {isAddScenarioOpen ? (
        <Suspense fallback={null}>
          <ScenarioOfferModal
            drivingDefaults={drivingDefaults}
            isOpen={isAddScenarioOpen}
            scenarioModalMode={scenarioModalMode}
            editingScenarioId={editingScenarioId}
            newScenario={newScenario}
            applications={applications}
            onAddLoadedApplication={handleAddLoadedApplication}
            scenarioBenefitItems={scenarioBenefitItems}
            customFormTaxPreview={customFormTaxPreview}
            maritalStatus={maritalStatus}
            stateTaxRate={stateTaxRate}
            stateNameToAbbr={stateNameToAbbr}
            cityCostOfLiving={cityCostOfLiving}
            stateColBase={stateColBase}
            effectiveMonthlyRent={effectiveMonthlyRent}
            referenceColIndex={referenceColIndex}
            referenceLocation={referenceLocation}
            allUsCityOptions={allUsCityOptions}
            onClose={() => {
              setIsAddScenarioOpen(false);
              resetScenarioDraft();
            }}
            onSubmit={addScenarioOffer}
            setNewScenario={setNewScenario}
            patchNewScenario={patchNewScenario}
            setNewScenarioField={setNewScenarioField}
            addScenarioBenefitItem={addScenarioBenefitItem}
            updateScenarioBenefitItem={updateScenarioBenefitItem}
            removeScenarioBenefitItem={removeScenarioBenefitItem}
          />
        </Suspense>
      ) : null}

      {negotiatingOffer && (
        <Suspense fallback={null}>
          <NegotiationAdvisorModal
            offer={negotiatingOffer}
            application={applicationsById[negotiatingOffer.application]}
            open={!!negotiatingOffer}
            onClose={() => setNegotiatingOffer(null)}
            onPersistRisks={(risks) => persistOfferUpdates(negotiatingOffer, { risk_notes: risks })}
          />
        </Suspense>
      )}

      {negotiationLogOffer && (
        <Suspense fallback={null}>
          <NegotiationLogModal
            offer={negotiationLogOffer}
            offerLabel={getApplicationName(negotiationLogOffer.application)}
            open={!!negotiationLogOffer}
            onClose={() => setNegotiationLogOffer(null)}
            onSave={(updates) => persistOfferUpdates(negotiationLogOffer, updates)}
          />
        </Suspense>
      )}
    </>
  );
};

export default OfferModalStack;
