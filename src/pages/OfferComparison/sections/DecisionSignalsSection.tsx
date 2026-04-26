import type { DayOneGcStatus, VisaSponsorshipStatus } from '../calculations';

type DecisionSignalsSectionProps = {
  visaSponsorship: VisaSponsorshipStatus;
  onVisaSponsorshipChange: (value: VisaSponsorshipStatus) => void;
  dayOneGc: DayOneGcStatus;
  onDayOneGcChange: (value: DayOneGcStatus) => void;
  growthScore?: number | null;
  onGrowthScoreChange: (value: number | null) => void;
  workLifeScore?: number | null;
  onWorkLifeScoreChange: (value: number | null) => void;
  brandScore?: number | null;
  onBrandScoreChange: (value: number | null) => void;
  teamScore?: number | null;
  onTeamScoreChange: (value: number | null) => void;
};

const scoreOptions = [
  { value: 1, label: '1 - Weak' },
  { value: 2, label: '2 - Below avg' },
  { value: 3, label: '3 - Solid' },
  { value: 4, label: '4 - Strong' },
  { value: 5, label: '5 - Excellent' },
];

const toScore = (value: string) => {
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
};

const DecisionSignalsSection = ({
  visaSponsorship,
  onVisaSponsorshipChange,
  dayOneGc,
  onDayOneGcChange,
  growthScore,
  onGrowthScoreChange,
  workLifeScore,
  onWorkLifeScoreChange,
  brandScore,
  onBrandScoreChange,
  teamScore,
  onTeamScoreChange,
}: DecisionSignalsSectionProps) => (
  <details className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
    <summary className="cursor-pointer list-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-gray-900">Advanced Decision Signals</h3>
          <p className="text-xs text-gray-500">
            Optional. Blank fields are not included in the offer scorecard.
          </p>
        </div>
        <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-600">
          Expand
        </span>
      </div>
    </summary>

    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Visa Sponsorship</label>
        <select
          value={visaSponsorship}
          onChange={(event) => onVisaSponsorshipChange(event.target.value as VisaSponsorshipStatus)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Not specified</option>
          <option value="NOT_NEEDED">Not needed</option>
          <option value="AVAILABLE">Sponsorship available</option>
          <option value="TRANSFER_ONLY">Transfer only</option>
          <option value="NOT_AVAILABLE">No sponsorship</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Day 1 GC</label>
        <select
          value={dayOneGc}
          onChange={(event) => onDayOneGcChange(event.target.value as DayOneGcStatus)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Not specified</option>
          <option value="YES">Yes</option>
          <option value="NO">No</option>
          <option value="NOT_APPLICABLE">Not applicable</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Growth Score</label>
        <select
          value={growthScore ?? ''}
          onChange={(event) => onGrowthScoreChange(toScore(event.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Not scored</option>
          {scoreOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Work-Life Score</label>
        <select
          value={workLifeScore ?? ''}
          onChange={(event) => onWorkLifeScoreChange(toScore(event.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Not scored</option>
          {scoreOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Brand Score</label>
        <select
          value={brandScore ?? ''}
          onChange={(event) => onBrandScoreChange(toScore(event.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Not scored</option>
          {scoreOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Manager / Team Score</label>
        <select
          value={teamScore ?? ''}
          onChange={(event) => onTeamScoreChange(toScore(event.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Not scored</option>
          {scoreOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  </details>
);

export default DecisionSignalsSection;
