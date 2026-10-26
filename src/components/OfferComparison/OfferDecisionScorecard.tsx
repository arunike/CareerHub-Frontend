import { useEffect, useMemo, useState } from 'react';
import {
  type ApplicationLike as Application,
  type OfferLike as Offer,
} from '../../utils/OfferComparison/calculations';
import { Tooltip, Popover, Grid } from 'antd';
import MobileModal from '../modals/MobileModal';
import { CloseCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import type { AdjustedOfferMetrics } from '../../utils/OfferComparison/types';
import type {
  MaritalStatus,
  OfferStatusFilter,
  SimulatedOffer,
} from '../../utils/OfferComparison/calculations';
import { formatExperienceRange, isPastRole } from '../../utils/OfferComparison/calculations';
import type { ScenarioRow } from '../../utils/OfferComparison/offerAdjustmentsTypes';
import { LevelBadge } from '../display/LevelBadge';
import ScorecardSidebar from './ScorecardSidebar';
import ScorecardTitleBar from './ScorecardTitleBar';
import ScorecardCompBreakdown from './ScorecardCompBreakdown';
import ScorecardCategoryList from './ScorecardCategoryList';
import ScorecardEvidence from './ScorecardEvidence';
import ScorecardActionBar from './ScorecardActionBar';
import { totalCompFor } from '../../utils/OfferComparison/totalCompDiff';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  DEFAULT_WEIGHTS,
  hasImmigrationSignal,
  normalizeScoreWeights,
} from '../../utils/OfferComparison/decisionScoring';
import type { CategoryKey, DecisionRow } from '../../utils/OfferComparison/decisionScoring';
import { buildRows } from '../../utils/OfferComparison/decisionRows';
import { ScoreBreakdownContent } from './ScoreBreakdown';

type Props = {
  filteredOffers: Offer[];
  // Unfiltered, so the bonus given up does not depend on the current view.
  allOffers: Offer[];
  // Untouched by repricing, so a row hands back the record rather than a derived copy.
  rawOffers: Offer[];
  offers: Offer[];
  applicationsById: Record<number, Application | undefined>;
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>;
  onScoreUpdate?: (appId: number, patch: Partial<Application>) => Promise<void>;
  onEditClick: (offer: Offer) => void;
  onToggleCurrent: (offer: Offer) => void;
  onToggleRejected?: (offer: Offer) => void;
  statusFilter?: OfferStatusFilter;
  setStatusFilter?: (filter: OfferStatusFilter) => void;
  rejectedOffersCount?: number;
  pastOffersCount?: number;
  onNegotiateClick: (offer: Offer) => void;
  onNegotiationLogClick?: (offer: Offer) => void;
  onRaiseHistoryClick: (offer: Offer) => void;
  onSaveSnapshotClick: (offer: Offer, row: DecisionRow) => void;
  onSnapshotsClick: (offer: Offer) => void;
  onDecisionJournalClick: (offer: Offer) => void;
  onDeleteClick: (offer: Offer) => void;

  simulatedOffers: SimulatedOffer[];
  scenarioRows: ScenarioRow[];
  maritalStatus: MaritalStatus;
  setMaritalStatus: (s: MaritalStatus) => void;
  maritalStatusOptions: { code: string; label: string }[];
  saveAdjustments: () => void;
  onEditScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  onAddScenario: () => void;
  onDecisionOrderChange?: (orderedIds: string[]) => void;
};

// Never flip above the card, yet still slide sideways on a phone; shiftY stops antd re-enabling it.
export const SCORE_POPOVER_OVERFLOW = { adjustX: 1, adjustY: 0, shiftY: true } as unknown as {
  adjustX: 0 | 1;
  adjustY: 0 | 1;
};

// A popover anchored to a score is unusable on a phone, so below md it opens as a sheet instead.
const ScoreBreakdownTrigger = ({
  row,
  isMobile,
  children,
}: {
  row: DecisionRow;
  isMobile: boolean;
  onOpenSheet: () => void;
  children: React.ReactNode;
}) => {
  if (isMobile) return <>{children}</>;
  return (
    <Popover
      content={<ScoreBreakdownContent row={row} />}
      title={
        <span className="text-sm font-bold text-slate-800 dark:text-ink-50">
          How {row.company}'s score is calculated
        </span>
      }
      trigger="click"
      placement="bottomRight"
      autoAdjustOverflow={SCORE_POPOVER_OVERFLOW}
      overlayStyle={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      {children}
    </Popover>
  );
};

const OfferDecisionScorecard = ({
  filteredOffers,
  allOffers,
  rawOffers,
  offers,
  applicationsById,
  adjustedByOfferId,
  onScoreUpdate,
  onEditClick,
  onToggleCurrent,
  onToggleRejected,
  statusFilter,
  setStatusFilter,
  rejectedOffersCount,
  pastOffersCount,
  onNegotiateClick,
  onNegotiationLogClick,
  onRaiseHistoryClick,
  onSaveSnapshotClick,
  onSnapshotsClick,
  onDecisionJournalClick,
  onDeleteClick,
  simulatedOffers,
  scenarioRows,
  maritalStatus,
  setMaritalStatus,
  maritalStatusOptions,
  saveAdjustments,
  onEditScenario,
  onDeleteScenario,
  onAddScenario,
  onDecisionOrderChange,
  extraHeaderNode,
}: Props & { extraHeaderNode?: React.ReactNode }) => {
  const screens = Grid.useBreakpoint();
  // antd's md is 768px, the same width MobileModal switches to a drawer at.
  const isMobile = !screens.md;
  const [breakdownRow, setBreakdownRow] = useState<DecisionRow | null>(null);

  const [weights, setWeights] = usePersistedState<Record<CategoryKey, number>>(
    'offerScoreWeights',
    DEFAULT_WEIGHTS,
    { deserialize: (raw) => normalizeScoreWeights(JSON.parse(raw)) }
  );

  const [isWeightsExpanded, setIsWeightsExpanded] = useState(false);
  const [collapsedDetailIds, setCollapsedDetailIds] = useState<Set<string>>(() => new Set());
  const [expandedMedicalDetailIds, setExpandedMedicalDetailIds] = useState<Set<string>>(
    () => new Set()
  );

  const toggleOfferDetails = (rowId: string) => {
    setCollapsedDetailIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const toggleMedicalDetails = (rowId: string) => {
    setExpandedMedicalDetailIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const anyImmigrationSignal = useMemo(() => {
    return Object.values(applicationsById).some((app) => hasImmigrationSignal(app));
  }, [applicationsById]);

  const rows = useMemo(
    () =>
      buildRows(
        filteredOffers,
        applicationsById,
        adjustedByOfferId,
        weights,
        simulatedOffers,
        scenarioRows,
        undefined,
        rawOffers,
        allOffers
      ),
    [
      adjustedByOfferId,
      applicationsById,
      filteredOffers,
      allOffers,
      weights,
      simulatedOffers,
      scenarioRows,
      rawOffers,
    ]
  );

  useEffect(() => {
    onDecisionOrderChange?.(
      rows.map((row) => `${row.isSimulated ? 'sim' : 'real'}-${row.offer.id}`)
    );
  }, [onDecisionOrderChange, rows]);

  const financialBarMax = Math.max(
    100,
    ...rows.map(
      (row) => row.categories.find((category) => category.key === 'financial')?.score || 0
    )
  );

  // Baseline candidates are offers whose linked role is still held; more than one is normal.
  const offerLabel = (offer: Offer) =>
    offer.linked_experience?.company || offer.application_details?.company || 'this role';

  const baselineCandidates = offers.filter((o) => !o.is_current && o.linked_experience?.is_current);

  const currentOffer = offers.find((o) => o.is_current);
  const baselineLabel = currentOffer ? offerLabel(currentOffer) : null;
  // The same sum the diff is measured against, so the two sides cannot drift apart.
  const currentTotal = currentOffer ? totalCompFor(currentOffer) : 0;

  const leader = rows[0];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 shadow-sm">
      <ScorecardTitleBar
        leader={leader}
        offers={offers}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        rejectedOffersCount={rejectedOffersCount}
        pastOffersCount={pastOffersCount}
        extraHeaderNode={extraHeaderNode}
      />

      <div className="grid items-start gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Unmounting the card when nothing matches took the compare picker away with it. */}
          {rows.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-ink-400">
              No offers match the current filters. Clear the compare picker above to see them all.
            </p>
          )}
          {rows.map((row) => {
            const app = applicationsById[row.applicationId];
            const isRowRejected =
              !row.isSimulated &&
              ((row.offer as Offer).final_decision_status === 'REJECTED' ||
                (row.offer as Offer).final_decision_status === 'DECLINED' ||
                app?.status === 'OFFER_REJECTED' ||
                app?.status === 'REJECTED');

            // Rejected wins, as in the Past Experience filter: a declined offer was never held.
            const rowExperience = row.isSimulated ? null : (row.offer as Offer).linked_experience;
            const isRowPast = !isRowRejected && isPastRole(row.offer as Offer);
            const showDeltas = !!currentOffer && !(row.offer as Offer).is_current;

            return (
              <article
                key={row.id}
                // The anchor a ?offer=<id> deep link scrolls to.
                id={`offer-card-${row.offer.id}`}
                className={clsx(
                  'relative flex flex-col overflow-hidden rounded-3xl border shadow-sm transition-all hover:shadow-md',
                  isRowRejected
                    ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50/20 dark:bg-rose-500/10 hover:border-rose-400'
                    : isRowPast
                      ? 'border-slate-300 dark:border-white/[0.12] bg-slate-50/40 dark:bg-ink-900/40 hover:border-slate-400'
                      : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 hover:border-sky-300'
                )}
              >
                {/* Card Header */}
                <div
                  className={clsx(
                    'border-b px-4 py-4 sm:px-6 sm:py-5',
                    isRowRejected
                      ? 'border-rose-100 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/10'
                      : isRowPast
                        ? 'border-slate-200 dark:border-white/[0.08] bg-slate-100/60 dark:bg-ink-800/60'
                        : 'border-slate-100 dark:border-white/[0.07] bg-slate-50/50 dark:bg-ink-900/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={clsx(
                            'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm',
                            isRowRejected
                              ? 'bg-rose-500'
                              : isRowPast
                                ? 'bg-slate-500 dark:bg-ink-700'
                                : 'bg-sky-600'
                          )}
                        >
                          {row.rank}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-ink-50">
                          {row.company}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-500 dark:text-ink-400">
                          {row.role}
                        </p>
                        <LevelBadge level={row.level} company={row.company} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <ScoreBreakdownTrigger
                        row={row}
                        isMobile={isMobile}
                        onOpenSheet={() => setBreakdownRow(row)}
                      >
                        <button
                          type="button"
                          onClick={isMobile ? () => setBreakdownRow(row) : undefined}
                          className="group flex min-h-11 cursor-pointer flex-col items-end justify-center text-right transition-opacity hover:opacity-80"
                          aria-label={`View score breakdown for ${row.company}`}
                        >
                          <p
                            className={clsx(
                              'text-3xl font-black tracking-tight group-hover:underline decoration-dotted underline-offset-4',
                              isRowRejected
                                ? 'text-rose-600 dark:text-rose-300'
                                : 'text-sky-600 dark:text-sky-300'
                            )}
                          >
                            {row.score}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-ink-500 flex items-center gap-1">
                            Total Score
                          </p>
                        </button>
                      </ScoreBreakdownTrigger>
                    </div>
                  </div>

                  {/* Tags */}
                  {(() => {
                    const rawFlexible =
                      app?.flexible_hours_policy || (row.offer as any).flexible_hours_policy;
                    const flexibleHoursLabel =
                      rawFlexible === 'FLEXIBLE'
                        ? 'Flexible Hours'
                        : rawFlexible === 'CORE_HOURS'
                          ? 'Core Hours'
                          : rawFlexible === 'STRICT'
                            ? 'Strict Hours'
                            : '';

                    const rawTravel = app?.travel_frequency || (row.offer as any).travel_frequency;
                    const travelFrequencyLabel =
                      rawTravel === 'NONE'
                        ? 'No Travel'
                        : rawTravel === 'LOW'
                          ? 'Low Travel (<10%)'
                          : rawTravel === 'MEDIUM'
                            ? 'Medium Travel (10-25%)'
                            : rawTravel === 'HIGH'
                              ? 'High Travel (>25%)'
                              : '';

                    return (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {isRowRejected && (
                          <span className="rounded-lg border border-rose-200 dark:border-rose-500/25 bg-rose-100/80 dark:bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 shadow-sm flex items-center gap-1">
                            <CloseCircleOutlined /> Rejected
                          </span>
                        )}
                        {isRowPast && rowExperience && (
                          <span className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-slate-100 dark:bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-ink-200 shadow-sm">
                            <HistoryOutlined /> Past Role
                            {rowExperience.start_date && (
                              <span className="font-medium text-slate-500 dark:text-ink-400">
                                · {formatExperienceRange(rowExperience)}
                              </span>
                            )}
                          </span>
                        )}
                        {/* `Offer.is_current` is the comparison baseline; the linked experience says if the role is held. */}
                        {!row.isSimulated && (row.offer as Offer).is_current && (
                          <Tooltip
                            title={
                              isRowPast
                                ? 'Comparisons still measure against this role. Use Mark Current on the role you hold now to move the baseline.'
                                : undefined
                            }
                          >
                            <span
                              className={clsx(
                                'rounded-lg border px-2.5 py-1 text-[11px] font-semibold shadow-sm',
                                isRowPast
                                  ? 'cursor-help border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              )}
                            >
                              {isRowPast ? 'Comparison Baseline' : 'Current'}
                            </span>
                          </Tooltip>
                        )}
                        {isRowPast &&
                          (row.offer as Offer).is_current &&
                          baselineCandidates.length > 0 &&
                          (baselineCandidates.length === 1 ? (
                            <button
                              type="button"
                              onClick={() => onToggleCurrent(baselineCandidates[0])}
                              className="rounded-lg border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 shadow-sm transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            >
                              Move to {offerLabel(baselineCandidates[0])} →
                            </button>
                          ) : (
                            <Popover
                              trigger="click"
                              placement="bottom"
                              content={
                                <div className="flex w-56 flex-col py-1">
                                  <p className="px-2 pb-1.5 text-[11px] text-slate-500 dark:text-ink-400">
                                    You hold more than one role, so pick the one comparisons should
                                    measure against.
                                  </p>
                                  {baselineCandidates.map((candidate) => (
                                    <button
                                      key={candidate.id}
                                      type="button"
                                      onClick={() => onToggleCurrent(candidate)}
                                      className="rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-ink-100 hover:bg-slate-50 dark:hover:bg-ink-800"
                                    >
                                      {offerLabel(candidate)}
                                      {candidate.linked_experience?.start_date && (
                                        <span className="ml-1 font-medium text-slate-400 dark:text-ink-500">
                                          {formatExperienceRange(candidate.linked_experience)}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              }
                            >
                              <button
                                type="button"
                                className="rounded-lg border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 shadow-sm transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10"
                              >
                                Move baseline →
                              </button>
                            </Popover>
                          ))}
                        {[
                          row.hasImmigrationSignal ? row.immigrationLabel : '',
                          row.workModeLabel,
                          flexibleHoursLabel,
                          travelFrequencyLabel,
                        ]
                          .filter(Boolean)
                          .map((label) => (
                            <span
                              key={label}
                              className="rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-ink-200 shadow-sm"
                            >
                              {label}
                            </span>
                          ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Card Body - Scores */}
                <div className="p-4 sm:p-6">
                  {/* Compensation Breakdown */}
                  <ScorecardCompBreakdown
                    row={row}
                    adjustedByOfferId={adjustedByOfferId}
                    collapsedDetailIds={collapsedDetailIds}
                    expandedMedicalDetailIds={expandedMedicalDetailIds}
                    scenarioRows={scenarioRows}
                    showDeltas={showDeltas}
                    baselineLabel={baselineLabel}
                    currentOffer={currentOffer}
                    currentTotal={currentTotal}
                    toggleMedicalDetails={toggleMedicalDetails}
                    toggleOfferDetails={toggleOfferDetails}
                  />

                  <ScorecardCategoryList
                    row={row}
                    applicationsById={applicationsById}
                    onScoreUpdate={onScoreUpdate}
                    financialBarMax={financialBarMax}
                  />
                </div>

                {/* Decision Evidence */}
                <ScorecardEvidence row={row} />

                {/* Action Bar */}
                <ScorecardActionBar
                  row={row}
                  applicationsById={applicationsById}
                  isRowRejected={isRowRejected}
                  onEditClick={onEditClick}
                  onToggleCurrent={onToggleCurrent}
                  onToggleRejected={onToggleRejected}
                  onNegotiateClick={onNegotiateClick}
                  onNegotiationLogClick={onNegotiationLogClick}
                  onRaiseHistoryClick={onRaiseHistoryClick}
                  onSaveSnapshotClick={onSaveSnapshotClick}
                  onSnapshotsClick={onSnapshotsClick}
                  onDecisionJournalClick={onDecisionJournalClick}
                  onDeleteClick={onDeleteClick}
                  onEditScenario={onEditScenario}
                  onDeleteScenario={onDeleteScenario}
                />
              </article>
            );
          })}
        </div>

        <ScorecardSidebar
          maritalStatus={maritalStatus}
          setMaritalStatus={setMaritalStatus}
          maritalStatusOptions={maritalStatusOptions}
          saveAdjustments={saveAdjustments}
          onAddScenario={onAddScenario}
          weights={weights}
          setWeights={setWeights}
          anyImmigrationSignal={anyImmigrationSignal}
          isWeightsExpanded={isWeightsExpanded}
          setIsWeightsExpanded={setIsWeightsExpanded}
        />
      </div>

      {/* One sheet for the whole list rather than one per card. */}
      <MobileModal
        open={Boolean(breakdownRow)}
        onCancel={() => setBreakdownRow(null)}
        footer={null}
        title={
          breakdownRow ? (
            <span className="text-sm font-bold text-slate-800 dark:text-ink-50">
              How {breakdownRow.company}'s score is calculated
            </span>
          ) : null
        }
      >
        {breakdownRow ? <ScoreBreakdownContent row={breakdownRow} variant="sheet" /> : null}
      </MobileModal>
    </section>
  );
};

export default OfferDecisionScorecard;
