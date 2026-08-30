import { useEffect, useMemo, useState } from 'react';
import { type ApplicationLike as Application, type OfferLike as Offer } from './calculations';
import { Tooltip, Popover, Segmented } from 'antd';
import { CloseCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import type { AdjustedOfferMetrics } from './types';
import type { MaritalStatus, OfferStatusFilter, SimulatedOffer } from './calculations';
import { formatExperienceRange, isPastRole } from './calculations';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import ScorecardSidebar from './ScorecardSidebar';
import ScorecardCompBreakdown from './ScorecardCompBreakdown';
import ScorecardCategoryList from './ScorecardCategoryList';
import ScorecardEvidence from './ScorecardEvidence';
import ScorecardActionBar from './ScorecardActionBar';
import { usePersistedState } from '../../hooks/usePersistedState';
import { getRealizableEquity } from './equityLiquidity';
import {
  DEFAULT_WEIGHTS,
  formatCurrency,
  hasImmigrationSignal,
  normalizeScoreWeights,
} from './decisionScoring';
import type { CategoryKey, DecisionRow } from './decisionScoring';
import { buildRows } from './decisionRows';
import { ScoreBreakdownContent } from './ScoreBreakdown';

type Props = {
  filteredOffers: Offer[];
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

const OfferDecisionScorecard = ({
  filteredOffers,
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
        scenarioRows
      ),
    [adjustedByOfferId, applicationsById, filteredOffers, weights, simulatedOffers, scenarioRows]
  );

  useEffect(() => {
    onDecisionOrderChange?.(
      rows.map((row) => `${row.isSimulated ? 'sim' : 'real'}-${row.offer.id}`)
    );
  }, [onDecisionOrderChange, rows]);

  if (rows.length === 0) return null;

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
  const currentTotal = currentOffer
    ? Number(currentOffer.base_salary) +
      Number(currentOffer.bonus) +
      getRealizableEquity(currentOffer) +
      Number(currentOffer.sign_on)
    : 0;

  const leader = rows[0];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white px-4 py-5 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shadow-sm ring-1 ring-sky-100">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-500">
                Decision Scorecard
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Best overall: <span className="text-sky-600">{leader.company}</span>
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 max-w-2xl">
              Weighted beyond total comp. Advanced signals only count after you fill them in.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {extraHeaderNode}
            {setStatusFilter && (
              <Segmented
                size="middle"
                options={[
                  { label: `All (${offers.length})`, value: 'all' },
                  {
                    // Both other buckets come out of Active, or past roles get counted twice.
                    label: `Active (${Math.max(
                      0,
                      offers.length - (rejectedOffersCount || 0) - (pastOffersCount || 0)
                    )})`,
                    value: 'active',
                  },
                  { label: `Past Experience (${pastOffersCount || 0})`, value: 'past' },
                  { label: `Rejected (${rejectedOffersCount || 0})`, value: 'rejected' },
                ]}
                value={statusFilter || 'all'}
                onChange={(val) => setStatusFilter(val as OfferStatusFilter)}
              />
            )}
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Top Score
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                  {leader.score}
                </p>
              </div>
              <div className="h-12 w-[1px] bg-slate-200" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Value
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight text-emerald-600">
                  {formatCurrency(leader.financialValue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-6 xl:grid-cols-2">
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
                className={clsx(
                  'relative flex flex-col overflow-hidden rounded-3xl border shadow-sm transition-all hover:shadow-md',
                  isRowRejected
                    ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                    : isRowPast
                      ? 'border-slate-300 bg-slate-50/40 hover:border-slate-400'
                      : 'border-slate-200 bg-white hover:border-sky-300'
                )}
              >
                {/* Card Header */}
                <div
                  className={clsx(
                    'border-b px-4 py-4 sm:px-6 sm:py-5',
                    isRowRejected
                      ? 'border-rose-100 bg-rose-50/40'
                      : isRowPast
                        ? 'border-slate-200 bg-slate-100/60'
                        : 'border-slate-100 bg-slate-50/50'
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
                                ? 'bg-slate-500'
                                : 'bg-sky-600'
                          )}
                        >
                          {row.rank}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{row.company}</h3>
                      </div>
                      <p className="text-sm font-medium text-slate-500">{row.role}</p>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <Popover
                        content={<ScoreBreakdownContent row={row} />}
                        title={
                          <span className="text-sm font-bold text-slate-800">
                            How {row.company}'s score is calculated
                          </span>
                        }
                        trigger="click"
                        placement="bottomRight"
                        overlayStyle={{ maxWidth: 'calc(100vw - 32px)' }}
                      >
                        <button
                          type="button"
                          className="group flex min-h-11 cursor-pointer flex-col items-end justify-center text-right transition-opacity hover:opacity-80"
                          aria-label={`View score breakdown for ${row.company}`}
                        >
                          <p
                            className={clsx(
                              'text-3xl font-black tracking-tight group-hover:underline decoration-dotted underline-offset-4',
                              isRowRejected ? 'text-rose-600' : 'text-sky-600'
                            )}
                          >
                            {row.score}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            Total Score
                          </p>
                        </button>
                      </Popover>
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
                          <span className="rounded-lg border border-rose-200 bg-rose-100/80 px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-sm flex items-center gap-1">
                            <CloseCircleOutlined /> Rejected
                          </span>
                        )}
                        {isRowPast && rowExperience && (
                          <span className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                            <HistoryOutlined /> Past Role
                            {rowExperience.start_date && (
                              <span className="font-medium text-slate-500">
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
                                  ? 'cursor-help border-amber-300 bg-amber-50 text-amber-700'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
                              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-50"
                            >
                              Move to {offerLabel(baselineCandidates[0])} →
                            </button>
                          ) : (
                            <Popover
                              trigger="click"
                              placement="bottom"
                              content={
                                <div className="flex w-56 flex-col py-1">
                                  <p className="px-2 pb-1.5 text-[11px] text-slate-500">
                                    You hold more than one role, so pick the one comparisons should
                                    measure against.
                                  </p>
                                  {baselineCandidates.map((candidate) => (
                                    <button
                                      key={candidate.id}
                                      type="button"
                                      onClick={() => onToggleCurrent(candidate)}
                                      className="rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      {offerLabel(candidate)}
                                      {candidate.linked_experience?.start_date && (
                                        <span className="ml-1 font-medium text-slate-400">
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
                                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-50"
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
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
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
    </section>
  );
};

export default OfferDecisionScorecard;
