import React from 'react';
import Modal from '../../components/MobileModal';
import { DollarCircleOutlined } from '@ant-design/icons';
import { type ExperienceCompensationSnapshot } from './compensation';
import type { HourlyInputUpdate } from './compensationBreakdownFormat';
import { SalaryBreakdown } from './SalaryBreakdown';
import { HourlyBreakdown } from './HourlyBreakdown';
import { OverallPayBreakdown } from './OverallPayBreakdown';
import { OverallInternshipBreakdown } from './OverallInternshipBreakdown';
import type { EarningsReport } from './earningsByYear';
import type { PayPart } from './PayPartsPanel';

type Props = ExperienceCompensationSnapshot & {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  roleTitle?: string;
  titleText?: string;
  contextLabel?: string;
  totalLabel?: string;
  totalHint?: string;
  onEdit?: () => void;
  editLabel?: string;
  hourlyStartDate?: string | null;
  hourlyEndDate?: string | null;
  hourlyIsCurrent?: boolean;
  onSaveHourlyInputs?: (values: HourlyInputUpdate) => Promise<void>;
  openSchedulePhases?: () => void;
  hourlyDisplayMode?: 'standard' | 'aggregate';
  // Replaces the single-role view with the combined one: parts of pay, roles inside each.
  overallEarnings?: EarningsReport;
  overallInternship?: { parts: PayPart[]; roleCount: number; hours: number };
};

const CompensationBreakdownModal: React.FC<Props> = ({
  open,
  onClose,
  companyName,
  roleTitle,
  titleText,
  contextLabel,
  totalLabel,
  totalHint,
  onEdit,
  editLabel,
  hourlyStartDate,
  hourlyEndDate,
  hourlyIsCurrent,
  onSaveHourlyInputs,
  openSchedulePhases,
  hourlyDisplayMode,
  overallEarnings,
  overallInternship,
  ...snapshot
}) => {
  const resolvedContextLabel = contextLabel ?? [roleTitle, companyName].filter(Boolean).join(' @ ');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={860}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <DollarCircleOutlined className="text-emerald-500 dark:text-emerald-400" />
          <span>
            {titleText ??
              (snapshot.kind === 'hourly'
                ? 'Internship Earnings Breakdown'
                : 'Pay Structure Breakdown')}
            {resolvedContextLabel && (
              <span className="ml-2 font-normal text-gray-500 dark:text-ink-400">
                {resolvedContextLabel}
              </span>
            )}
          </span>
        </div>
      }
    >
      {overallInternship ? (
        <OverallInternshipBreakdown {...overallInternship} />
      ) : overallEarnings ? (
        <OverallPayBreakdown groups={overallEarnings.groups} skipped={overallEarnings.skipped} />
      ) : snapshot.kind === 'salary' ? (
        <SalaryBreakdown
          total={snapshot.total}
          base={snapshot.base}
          bonus={snapshot.bonus}
          equity={snapshot.equity}
          earningsYears={snapshot.earningsYears}
          ledgerYears={snapshot.ledgerYears}
          totalLabel={totalLabel}
          totalHint={totalHint}
          onEdit={onEdit}
          editLabel={editLabel}
        />
      ) : (
        <HourlyBreakdown
          total={snapshot.total}
          hourlyRate={snapshot.hourlyRate}
          hoursPerDay={snapshot.hoursPerDay}
          workingDaysPerWeek={snapshot.workingDaysPerWeek}
          totalHoursWorked={snapshot.totalHoursWorked}
          overtimeHours={snapshot.overtimeHours}
          overtimeRate={snapshot.overtimeRate}
          overtimeMultiplier={snapshot.overtimeMultiplier}
          effectiveOvertimeRate={snapshot.effectiveOvertimeRate}
          regularPay={snapshot.regularPay}
          overtimePay={snapshot.overtimePay}
          totalEarningsOverride={snapshot.totalEarningsOverride}
          autoCalculatedHours={snapshot.autoCalculatedHours}
          estimatedHours={snapshot.estimatedHours}
          weekdaysWorked={snapshot.weekdaysWorked}
          calculationMode={snapshot.calculationMode}
          dateRangeLabel={snapshot.dateRangeLabel}
          totalLabel={totalLabel}
          totalHint={totalHint}
          startDate={hourlyStartDate}
          endDate={hourlyEndDate}
          isCurrent={hourlyIsCurrent}
          onSaveHourlyInputs={onSaveHourlyInputs}
          isMultiPhase={snapshot.isMultiPhase}
          openSchedulePhases={openSchedulePhases}
          displayMode={hourlyDisplayMode}
        />
      )}
    </Modal>
  );
};

export default CompensationBreakdownModal;
