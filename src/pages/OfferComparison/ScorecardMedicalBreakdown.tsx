import type { DecisionRow } from './decisionScoring';
import { computeDetailedMedicalBreakdown } from './calculations';
import { DownOutlined, RightOutlined } from '@ant-design/icons';

type Props = {
  row: DecisionRow;
  expandedMedicalDetailIds: Set<string>;
  toggleMedicalDetails: (rowId: string) => void;
};

const ScorecardMedicalBreakdown = ({
  row,
  expandedMedicalDetailIds,
  toggleMedicalDetails,
}: Props) => (
  <>
    {(() => {
      const med = computeDetailedMedicalBreakdown(row.offer);
      const isMedicalExpanded = expandedMedicalDetailIds.has(row.id);
      return (
        <div className="col-span-2 mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 sm:p-4">
          {/* Header Toggle */}
          <button
            type="button"
            onClick={() => toggleMedicalDetails(row.id)}
            aria-expanded={isMedicalExpanded}
            className="flex w-full items-center justify-between text-left focus:outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                Healthcare Breakdown
              </span>
              {med.worstCaseRisk > 0 && (
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                  Max Risk: ${med.worstCaseRisk.toLocaleString()}/yr
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 group-hover:text-sky-800 transition-colors">
              {isMedicalExpanded ? 'Hide' : 'View breakdown'}
              {isMedicalExpanded ? (
                <DownOutlined className="text-[9px]" />
              ) : (
                <RightOutlined className="text-[9px]" />
              )}
            </span>
          </button>

          {/* Expanded Content */}
          {isMedicalExpanded && (
            <div className="mt-3.5 space-y-3 border-t border-slate-200/60 pt-3.5">
              {/* Summary Row */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200/70 bg-white p-3 shadow-2xs">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Annual Premiums
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-slate-900">
                    ${med.totalAnnualPremiums.toLocaleString()}
                    <span className="text-[10px] font-normal text-slate-400">/yr</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-800">
                    Worst-Case Exposure
                  </div>
                  <div className="mt-0.5 text-xs font-extrabold text-sky-900">
                    ${med.worstCaseRisk.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Out-of-Pocket Max
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-700">
                    ${med.effectiveOopMax.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    HSA Employer Match
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-emerald-600">
                    {med.hsaMatch > 0 ? `+$${med.hsaMatch.toLocaleString()}/yr` : '$0'}
                  </div>
                </div>
              </div>

              {/* Medical Plan Card */}
              <div className="rounded-xl border border-slate-200/70 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold tracking-tight text-slate-900">
                    Medical — {med.planType}
                  </span>
                  {med.hasDependents && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                      {med.dependentTier.replace('EMPLOYEE_', 'Emp + ')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      Paycheck Premium
                    </span>
                    <span className="font-semibold text-slate-900">
                      ${med.totalMedPaycheck} / check
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      (${med.annualMedPrem.toLocaleString()}/yr)
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      Out-of-Pocket Max
                    </span>
                    <span className="font-semibold text-slate-900">
                      ${med.indOopMax.toLocaleString()}
                    </span>
                    {med.famOopMax > 0 && (
                      <span className="block text-[10px] text-slate-400">
                        (${med.famOopMax.toLocaleString()} Fam)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Deductible</span>
                    <span className="font-medium text-slate-900">
                      ${med.indDeductible.toLocaleString()}
                    </span>
                    {med.famDeductible > 0 && (
                      <span className="block text-[10px] text-slate-400">
                        (${med.famDeductible.toLocaleString()} Fam)
                      </span>
                    )}
                  </div>
                  {(med.pcpCopay > 0 || med.specCopay > 0) && (
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">Copays</span>
                      <span className="font-medium text-slate-900">
                        ${med.pcpCopay} PCP / ${med.specCopay} Spec
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dental Plan Card */}
              <div className="rounded-xl border border-slate-200/70 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold tracking-tight text-slate-900">
                    Dental — {med.dentalPlanName || 'Dental Plan'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      Paycheck Premium
                    </span>
                    <span className="font-semibold text-slate-900">
                      ${med.totalDenPaycheck} / check
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      (${med.annualDenPrem.toLocaleString()}/yr)
                    </span>
                  </div>
                  {med.dentalAnnualMax > 0 && (
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Annual Max Benefit
                      </span>
                      <span className="font-semibold text-slate-900">
                        ${med.dentalAnnualMax.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {med.dentalDeductible > 0 && (
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Deductible
                      </span>
                      <span className="font-medium text-slate-900">
                        ${med.dentalDeductible.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vision Plan Card */}
              <div className="rounded-xl border border-slate-200/70 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold tracking-tight text-slate-900">
                    Vision — {med.visionPlanName || 'Vision Plan'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      Paycheck Premium
                    </span>
                    <span className="font-semibold text-slate-900">
                      ${med.totalVisPaycheck} / check
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      (${med.annualVisPrem.toLocaleString()}/yr)
                    </span>
                  </div>
                  {(med.visionFramesAllowance > 0 || med.visionContactsAllowance > 0) && (
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Allowances
                      </span>
                      <span className="font-semibold text-slate-900">
                        ${med.visionFramesAllowance} Frames / ${med.visionContactsAllowance}{' '}
                        Contacts
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    })()}
  </>
);

export default ScorecardMedicalBreakdown;
