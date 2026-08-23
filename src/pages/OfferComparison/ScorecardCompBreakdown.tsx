import { type OfferLike as Offer } from './calculations';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { getEquityLiquidityCopy } from './equityLiquidity';
import HelpTooltipTrigger from '../../components/HelpTooltipTrigger';
import { ComponentDelta } from './ScoreBreakdown';
import ScorecardMedicalBreakdown from './ScorecardMedicalBreakdown';
import ScorecardTimeOffBlock from './ScorecardTimeOffBlock';

import type { DecisionRow } from './decisionScoring';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import type { AdjustedOfferMetrics } from './types';

type Props = {
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>;
  collapsedDetailIds: Set<string>;
  expandedMedicalDetailIds: Set<string>;
  row: DecisionRow;
  scenarioRows: ScenarioRow[];
  showDeltas: boolean;
  baselineLabel: string | null;
  currentOffer: Offer | undefined;
  currentTotal: number;
  toggleMedicalDetails: (rowId: string) => void;
  toggleOfferDetails: (rowId: string) => void;
};

const ScorecardCompBreakdown = ({
  baselineLabel,
  currentOffer,
  currentTotal,
  toggleMedicalDetails,
  toggleOfferDetails,
  adjustedByOfferId,
  collapsedDetailIds,
  expandedMedicalDetailIds,
  row,
  scenarioRows,
  showDeltas,
}: Props) => (
  <div className="mb-6 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
    <button
      type="button"
      onClick={() => toggleOfferDetails(row.id)}
      aria-expanded={!collapsedDetailIds.has(row.id)}
      className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 sm:px-6"
    >
      <span>
        <span className="block text-xs font-semibold text-slate-800">
          Compensation & benefits details
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-500">
          Cash, taxes, health insurance, retirement, and full time-off breakdown
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-sky-700">
        {!collapsedDetailIds.has(row.id) ? 'Hide' : 'View'}
        {!collapsedDetailIds.has(row.id) ? (
          <DownOutlined className="text-[10px]" />
        ) : (
          <RightOutlined className="text-[10px]" />
        )}
      </span>
    </button>

    {!collapsedDetailIds.has(row.id) && (
      <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <HelpTooltipTrigger
              title="Your fixed annual salary before tax, the main guaranteed component of compensation. The after-tax amount applies your estimated tax rate."
              ariaLabel="Explain base salary"
              density="comfortable"
              className="text-xs font-medium text-slate-500"
            >
              Base Salary
            </HelpTooltipTrigger>
            <div className="text-sm font-bold text-slate-900">
              ${Number(row.offer.base_salary).toLocaleString()}
            </div>
            {showDeltas && currentOffer && baselineLabel && (
              <ComponentDelta
                value={Number(row.offer.base_salary)}
                baseline={Number(currentOffer.base_salary)}
                baselineLabel={baselineLabel}
              />
            )}
            <div className="text-[10px] text-slate-400">
              After tax: $
              {Math.round(
                adjustedByOfferId[Number(row.offer.id)]?.afterTaxBase || 0
              ).toLocaleString()}
            </div>
          </div>
          <div>
            <HelpTooltipTrigger
              title="Annual performance bonus, typically a percentage of base and treated as a target amount. The after-tax estimate uses the supplemental bonus rate."
              ariaLabel="Explain annual bonus"
              density="comfortable"
              className="text-xs font-medium text-slate-500"
            >
              Bonus
            </HelpTooltipTrigger>
            <div className="text-sm font-bold text-slate-900">
              ${Number(row.offer.bonus).toLocaleString()}
            </div>
            {showDeltas && currentOffer && baselineLabel && (
              <ComponentDelta
                value={Number(row.offer.bonus)}
                baseline={Number(currentOffer.bonus)}
                baselineLabel={baselineLabel}
              />
            )}
            <div className="text-[10px] text-slate-400">
              After tax: $
              {Math.round(
                adjustedByOfferId[Number(row.offer.id)]?.afterTaxBonus || 0
              ).toLocaleString()}
            </div>
          </div>
          <div>
            <HelpTooltipTrigger
              title="Annualized grant value. Financial scoring counts the full value when it is tradable, the entered buyback value when a company buyback exists, and $0 while it is not sellable. Tax applies only to the realizable amount."
              ariaLabel="Explain annual equity"
              density="comfortable"
              className="text-xs font-medium text-slate-500"
            >
              Equity / Yr
            </HelpTooltipTrigger>
            <div className="text-sm font-bold text-slate-900">
              ${Number(row.offer.equity).toLocaleString()}
            </div>
            {showDeltas && currentOffer && baselineLabel && (
              <ComponentDelta
                value={Number(row.offer.equity)}
                baseline={Number(currentOffer.equity)}
                baselineLabel={baselineLabel}
              />
            )}
            {(() => {
              const liquidity = getEquityLiquidityCopy(row.offer);
              const simulatedMetrics = scenarioRows.find(
                (scenario) => String(scenario.offer.id) === String(row.offer.id)
              );
              const afterTax = row.isSimulated
                ? simulatedMetrics?.afterTaxEquity
                : adjustedByOfferId[Number(row.offer.id)]?.afterTaxEquity;
              return (
                <div className="text-[10px] text-slate-500">
                  {liquidity.label} · {liquidity.detail}
                  {liquidity.realizable > 0 && (
                    <span className="block text-slate-400">
                      After tax: ${Math.round(afterTax || 0).toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <div>
            <HelpTooltipTrigger
              title="One-time signing bonus paid when you join. Often subject to a clawback period (typically 1–2 years)."
              ariaLabel="Explain sign-on bonus"
              density="comfortable"
              className="text-xs font-medium text-slate-500"
            >
              Sign-On
            </HelpTooltipTrigger>
            <div className="text-sm font-bold text-slate-900">
              ${Number(row.offer.sign_on).toLocaleString()}
            </div>
            {showDeltas && currentOffer && baselineLabel && (
              <ComponentDelta
                value={Number(row.offer.sign_on)}
                baseline={Number(currentOffer.sign_on)}
                baselineLabel={baselineLabel}
              />
            )}
            {(() => {
              const simulatedMetrics = scenarioRows.find(
                (scenario) => String(scenario.offer.id) === String(row.offer.id)
              );
              const afterTax = row.isSimulated
                ? simulatedMetrics?.afterTaxSignOn
                : adjustedByOfferId[Number(row.offer.id)]?.afterTaxSignOn;
              const schedule = (row.offer.sign_on_schedule || []).map(Number);
              const paidYears = schedule.filter((amount) => amount > 0).length;
              return (
                <div className="text-[10px] text-slate-400">
                  {paidYears > 1
                    ? `Over ${paidYears} years · ${schedule
                        .filter((amount) => amount > 0)
                        .map((amount) => `$${Math.round(amount).toLocaleString()}`)
                        .join(' / ')}`
                    : 'One-time'}
                  {Number(row.offer.sign_on) > 0 && (
                    <span className="block">
                      After tax: ${Math.round(afterTax || 0).toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          {Number(row.offer.relocation_bonus || 0) > 0 && (
            <div>
              <HelpTooltipTrigger
                title="One-time relocation or signing perk cash value. The after-tax estimate uses the supplemental W2 bonus rate."
                ariaLabel="Explain relocation perk"
                density="comfortable"
                className="text-xs font-medium text-slate-500"
              >
                Relocation Perk
              </HelpTooltipTrigger>
              <div className="text-sm font-bold text-slate-900">
                ${Number(row.offer.relocation_bonus).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">
                After tax: $
                {Math.round(
                  adjustedByOfferId[Number(row.offer.id)]?.afterTaxRelocation || 0
                ).toLocaleString()}
              </div>
            </div>
          )}

          {/* Health Insurance & 401(k) Match Sub-section */}
          <div className="col-span-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <HelpTooltipTrigger
                  title="Monthly premium and annual HSA contribution details."
                  ariaLabel="Explain health insurance"
                  density="comfortable"
                  className="text-xs font-medium text-slate-500"
                >
                  Health Insurance
                </HelpTooltipTrigger>
                <div className="text-sm font-bold text-slate-900">
                  {Number(row.offer.health_premium_monthly || 0) > 0
                    ? `$${Number(row.offer.health_premium_monthly).toLocaleString()}/mo`
                    : 'Free Premium'}
                </div>
                {row.offer.health_plan_type && (
                  <div className="text-[10px] text-slate-500 font-medium">
                    Type: {row.offer.health_plan_type}
                  </div>
                )}
                {Number(row.offer.health_oop_max || 0) > 0 && (
                  <div className="text-[10px] text-slate-400">
                    OOP Max: ${Number(row.offer.health_oop_max).toLocaleString()}/yr
                  </div>
                )}
                {Number(row.offer.hsa_employer_contribution || 0) > 0 && (
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    HSA Match: +$
                    {Number(row.offer.hsa_employer_contribution).toLocaleString()}
                    /yr
                  </div>
                )}
              </div>
              <div>
                <HelpTooltipTrigger
                  title="401(k) Employer retirement match percentage and max contribution matched."
                  ariaLabel="Explain 401(k) matching"
                  density="comfortable"
                  className="text-xs font-medium text-slate-500"
                >
                  401(k) Matching
                </HelpTooltipTrigger>
                <div className="text-sm font-bold text-slate-900">
                  {Number(row.offer.forty_one_k_match_percent || 0) > 0 &&
                  Number(row.offer.forty_one_k_max_match || 0) > 0
                    ? `${Number(row.offer.forty_one_k_match_percent)}% match up to ${Number(row.offer.forty_one_k_max_match)}%`
                    : 'No 401(k) Match'}
                </div>
                {Number(row.offer.forty_one_k_match_percent || 0) > 0 &&
                  Number(row.offer.forty_one_k_max_match || 0) > 0 && (
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      Match Value: +$
                      {Math.round(
                        Number(row.offer.base_salary) *
                          (Number(row.offer.forty_one_k_max_match) / 100) *
                          (Number(row.offer.forty_one_k_match_percent) / 100)
                      ).toLocaleString()}
                      /yr
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Collapsible Healthcare Breakdown (Clean & Spacious Premium Stacked Design) */}
          <ScorecardMedicalBreakdown
            row={row}
            expandedMedicalDetailIds={expandedMedicalDetailIds}
            toggleMedicalDetails={toggleMedicalDetails}
          />

          <ScorecardTimeOffBlock row={row} currentTotal={currentTotal} />
        </div>
      </div>
    )}
  </div>
);

export default ScorecardCompBreakdown;
