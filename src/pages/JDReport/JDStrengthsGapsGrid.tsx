import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { StoredReport } from '../../utils/reportStorage';
import { isRecord, missingSkillName, skillName, supportLabel } from './jdReportFields';

type Props = {
  report: StoredReport;
};

const JDStrengthsGapsGrid = ({ report }: Props) => (
  <div
    className={`grid gap-6 ${report.matched_skills?.length > 0 && report.missing_skills?.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
  >
    {report.matched_skills?.length > 0 && (
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.07] p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <CheckCircleOutlined className="text-emerald-600 dark:text-emerald-300 text-sm" />
            </div>
            <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
              Strengths & Matches
            </span>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold border border-emerald-100 dark:border-emerald-500/20">
            {report.matched_skills.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {report.matched_skills.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  {skillName(s)}
                </span>
                {isRecord(s) && s.support_level && (
                  <span className="rounded-full bg-white dark:bg-ink-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/20">
                    {supportLabel(s.support_level)}
                  </span>
                )}
              </div>
              {isRecord(s) && s.evidence && (
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/75 dark:text-emerald-300 m-0">
                  Evidence: “{String(s.evidence)}”
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    {report.missing_skills?.length > 0 && (
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/[0.07] p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <WarningOutlined className="text-red-400 text-sm" />
            </div>
            <span className="font-semibold text-gray-800 dark:text-ink-50 text-sm">
              Identified Gaps
            </span>
          </div>
          <span className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full font-semibold border border-red-100 dark:border-red-500/20">
            {report.missing_skills.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {report.missing_skills.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/10 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  {missingSkillName(s)}
                </span>
                {isRecord(s) && s.severity && (
                  <span className="rounded-full bg-white dark:bg-ink-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                    {String(s.severity)}
                  </span>
                )}
              </div>
              {isRecord(s) && s.reason && (
                <p className="mt-1 text-[11px] leading-relaxed text-red-900/70 dark:text-red-300 m-0">
                  {String(s.reason)}
                </p>
              )}
              {isRecord(s) && s.resume_evidence_status && (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-red-400 m-0">
                  Evidence status: {String(s.resume_evidence_status)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default JDStrengthsGapsGrid;
