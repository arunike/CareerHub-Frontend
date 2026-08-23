import { buildPayGrowthSummary } from './payGrowth';
import { useMemo } from 'react';
import type { Experience } from '../../types';
import type { ExperienceCompensationSnapshot } from './compensation';

export const useExperienceCompSummaries = ({
  experiences,
  getCompensationSnapshot,
}: {
  experiences: Experience[];
  getCompensationSnapshot: (exp: Experience) => ExperienceCompensationSnapshot | null;
}) => {
  const fullTimeCompSummary = useMemo(() => {
    const fullTimeRoles = experiences.filter((exp) => exp.employment_type === 'full_time');
    const trackedComp = fullTimeRoles
      .map((exp) => getCompensationSnapshot(exp))
      .filter(
        (
          comp
        ): comp is Extract<
          NonNullable<ReturnType<typeof getCompensationSnapshot>>,
          { kind: 'salary' }
        > => comp !== null && comp.kind === 'salary'
      );

    return {
      roleCount: fullTimeRoles.length,
      trackedRoleCount: trackedComp.length,
      base: trackedComp.reduce((sum, comp) => sum + comp.base, 0),
      bonus: trackedComp.reduce((sum, comp) => sum + comp.bonus, 0),
      equity: trackedComp.reduce((sum, comp) => sum + comp.equity, 0),
      total: trackedComp.reduce((sum, comp) => sum + comp.total, 0),
    };
  }, [experiences, getCompensationSnapshot]);

  const internshipCompSnapshots = useMemo(() => {
    return experiences
      .filter((exp) => exp.employment_type === 'internship')
      .map((exp) => getCompensationSnapshot(exp))
      .filter(
        (
          comp
        ): comp is Extract<
          NonNullable<ReturnType<typeof getCompensationSnapshot>>,
          { kind: 'hourly' }
        > => comp !== null && comp.kind === 'hourly'
      );
  }, [experiences, getCompensationSnapshot]);

  const internshipCompSummary = useMemo(() => {
    const internshipRoles = experiences.filter((exp) => exp.employment_type === 'internship');
    const trackedComp = internshipCompSnapshots;

    const estimatedHours = trackedComp.reduce(
      (sum, comp) => sum + (comp.calculationMode === 'manual_total' ? 0 : comp.estimatedHours),
      0
    );
    const regularPay = trackedComp.reduce((sum, comp) => sum + comp.regularPay, 0);
    const overtimePay = trackedComp.reduce((sum, comp) => sum + comp.overtimePay, 0);

    return {
      roleCount: internshipRoles.length,
      trackedRoleCount: trackedComp.length,
      estimatedHours,
      regularPay,
      overtimePay,
      total: trackedComp.reduce((sum, comp) => sum + comp.total, 0),
      manualHoursRoleCount: trackedComp.filter((comp) => comp.calculationMode === 'manual_hours')
        .length,
      customTotalRoleCount: trackedComp.filter((comp) => comp.calculationMode === 'manual_total')
        .length,
    };
  }, [experiences, internshipCompSnapshots]);

  const payGrowth = useMemo(
    () => buildPayGrowthSummary(experiences, getCompensationSnapshot),
    [experiences, getCompensationSnapshot]
  );

  const payGrowthHeadline = payGrowth.defaultComparison?.headline ?? null;
  return {
    fullTimeCompSummary,
    internshipCompSnapshots,
    internshipCompSummary,
    payGrowth,
    payGrowthHeadline,
  };
};
