import UnitNumberInput from '../../../components/UnitNumberInput';
import { CONTROL_CLASS } from '../../../components/formControls';
import CommuteOptionsEditor from './CommuteOptionsEditor';
import { officeDaysPerYear, type CommuteOption, type DrivingDefaults } from '../commute';
type WorkSetupSectionProps = {
  workMode: 'REMOTE' | 'HYBRID' | 'ONSITE';
  onWorkModeChange: (value: 'REMOTE' | 'HYBRID' | 'ONSITE') => void;
  showRtoDays: boolean;
  rtoDaysPerWeek: number;
  onRtoDaysPerWeekChange: (value: number) => void;
  showCommuteAndPerks: boolean;
  commuteOptions?: CommuteOption[];
  onCommuteOptionsChange?: (value: CommuteOption[]) => void;
  ptoDays?: number;
  holidayDays?: number;
  flexibleHoursPolicy?: string;
  onFlexibleHoursPolicyChange?: (value: string) => void;
  travelFrequency?: string;
  onTravelFrequencyChange?: (value: string) => void;
  drivingDefaults?: Partial<DrivingDefaults> | null;
};

const WorkSetupSection = ({
  workMode,
  onWorkModeChange,
  showRtoDays,
  rtoDaysPerWeek,
  onRtoDaysPerWeekChange,
  showCommuteAndPerks,
  commuteOptions,
  onCommuteOptionsChange,
  ptoDays,
  holidayDays,
  flexibleHoursPolicy,
  onFlexibleHoursPolicyChange,
  travelFrequency,
  onTravelFrequencyChange,
  drivingDefaults,
}: WorkSetupSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
        <select
          value={workMode}
          onChange={(e) => onWorkModeChange(e.target.value as 'REMOTE' | 'HYBRID' | 'ONSITE')}
          className={CONTROL_CLASS}
        >
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">Onsite</option>
        </select>
      </div>
      {showRtoDays && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RTO Days / Week</label>
          <UnitNumberInput
            unit="days/wk"
            min={0}
            max={5}
            value={rtoDaysPerWeek || null}
            placeholder="0"
            onChange={(value) => onRtoDaysPerWeekChange(value ?? 0)}
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Flexible Hours Policy
        </label>
        <select
          value={flexibleHoursPolicy || 'UNKNOWN'}
          onChange={(e) => onFlexibleHoursPolicyChange?.(e.target.value)}
          className={CONTROL_CLASS}
        >
          <option value="UNKNOWN">Not specified</option>
          <option value="FLEXIBLE">Flexible Hours (Asynchronous)</option>
          <option value="CORE_HOURS">Core Hours (e.g. 10am-4pm)</option>
          <option value="STRICT">Strict / Fixed Hours</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Travel Frequency
        </label>
        <select
          value={travelFrequency || 'UNKNOWN'}
          onChange={(e) => onTravelFrequencyChange?.(e.target.value)}
          className={CONTROL_CLASS}
        >
          <option value="UNKNOWN">Not specified</option>
          <option value="NONE">No Travel (0%)</option>
          <option value="LOW">{'Low Travel (<10%)'}</option>
          <option value="MEDIUM">Medium Travel (10-25%)</option>
          <option value="HIGH">{'High Travel (>25%)'}</option>
        </select>
      </div>
      {/* Remote means zero office days; existing entries are kept, just not counted. */}
      {showCommuteAndPerks && workMode !== 'REMOTE' && onCommuteOptionsChange && (
        <div className="md:col-span-2">
          <CommuteOptionsEditor
            options={commuteOptions ?? []}
            onChange={onCommuteOptionsChange}
            officeDays={officeDaysPerYear({
              workMode,
              rtoDaysPerWeek,
              ptoDays,
              holidayDays,
            })}
            drivingDefaults={drivingDefaults}
          />
        </div>
      )}
    </div>
  );
};

export default WorkSetupSection;
