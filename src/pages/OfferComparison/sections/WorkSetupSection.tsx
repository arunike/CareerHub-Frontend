type WorkSetupSectionProps = {
  workMode: 'REMOTE' | 'HYBRID' | 'ONSITE';
  onWorkModeChange: (value: 'REMOTE' | 'HYBRID' | 'ONSITE') => void;
  showRtoDays: boolean;
  rtoDaysPerWeek: number;
  onRtoDaysPerWeekChange: (value: number) => void;
  showCommuteAndPerks: boolean;
  commuteCostValue: number;
  commuteCostFrequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  onCommuteCostValueChange: (value: number) => void;
  onCommuteCostFrequencyChange: (value: 'DAILY' | 'MONTHLY' | 'YEARLY') => void;
  freeFoodPerkValue: number;
  freeFoodPerkFrequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  onFreeFoodPerkValueChange: (value: number) => void;
  onFreeFoodPerkFrequencyChange: (value: 'DAILY' | 'MONTHLY' | 'YEARLY') => void;
};

const WorkSetupSection = ({
  workMode,
  onWorkModeChange,
  showRtoDays,
  rtoDaysPerWeek,
  onRtoDaysPerWeekChange,
  showCommuteAndPerks,
  commuteCostValue,
  commuteCostFrequency,
  onCommuteCostValueChange,
  onCommuteCostFrequencyChange,
  freeFoodPerkValue,
  freeFoodPerkFrequency,
  onFreeFoodPerkValueChange,
  onFreeFoodPerkFrequencyChange,
}: WorkSetupSectionProps) => {
  const annualizedCommute =
    commuteCostFrequency === 'DAILY'
      ? (Number(commuteCostValue) || 0) * 260
      : commuteCostFrequency === 'MONTHLY'
        ? (Number(commuteCostValue) || 0) * 12
        : Number(commuteCostValue) || 0;
  const annualizedFoodPerk =
    freeFoodPerkFrequency === 'DAILY'
      ? (Number(freeFoodPerkValue) || 0) * 260
      : freeFoodPerkFrequency === 'MONTHLY'
        ? (Number(freeFoodPerkValue) || 0) * 12
        : Number(freeFoodPerkValue) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
        <select
          value={workMode}
          onChange={(e) => onWorkModeChange(e.target.value as 'REMOTE' | 'HYBRID' | 'ONSITE')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">Onsite</option>
        </select>
      </div>
      {showRtoDays && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RTO Days / Week</label>
          <input
            type="number"
            min={0}
            max={5}
            value={rtoDaysPerWeek}
            onChange={(e) => onRtoDaysPerWeekChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}
      {showCommuteAndPerks && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Commute Cost</label>
          <div className="grid grid-cols-[1fr_132px] gap-2">
            <input
              type="number"
              min={0}
              value={commuteCostValue}
              onChange={(e) => onCommuteCostValueChange(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={commuteCostFrequency}
              onChange={(e) => onCommuteCostFrequencyChange(e.target.value as 'DAILY' | 'MONTHLY' | 'YEARLY')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="DAILY">/day</option>
              <option value="MONTHLY">/month</option>
              <option value="YEARLY">/year</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">Annualized total: ${Math.round(annualizedCommute).toLocaleString()}</p>
        </div>
      )}
      {showCommuteAndPerks && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Free Food Perk Value</label>
          <div className="grid grid-cols-[1fr_132px] gap-2">
            <input
              type="number"
              min={0}
              value={freeFoodPerkValue}
              onChange={(e) => onFreeFoodPerkValueChange(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={freeFoodPerkFrequency}
              onChange={(e) => onFreeFoodPerkFrequencyChange(e.target.value as 'DAILY' | 'MONTHLY' | 'YEARLY')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="DAILY">/day</option>
              <option value="MONTHLY">/month</option>
              <option value="YEARLY">/year</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">Annualized total: ${Math.round(annualizedFoodPerk).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default WorkSetupSection;
