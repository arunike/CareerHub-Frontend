import FriendlyTimeInput from '../../components/FriendlyTimeInput';
import { TIMEZONE_OPTIONS } from '../../lib/timezones';
import { syncTimeValue } from './sheetMapping';
import type { Draft } from './sheetMapping';

type Props = {
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
};

const SheetScheduleFields = ({ draft, updateDraft }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div>
      <label
        id="google-sheet-sync-time-label"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Daily Sync Time
      </label>
      <FriendlyTimeInput
        ariaLabelledBy="google-sheet-sync-time-label"
        ariaDescribedBy="google-sheet-sync-time-help"
        className="w-full text-base py-1.5 rounded-lg border-gray-300 hover:border-blue-500 focus:border-blue-500"
        value={syncTimeValue(draft.sync_time)}
        onChange={(time) => {
          if (time) updateDraft({ sync_time: time.format('HH:mm') });
        }}
        minuteStep={1}
        allowClear={false}
      />
      <p id="google-sheet-sync-time-help" className="text-xs text-gray-500 mt-1">
        Vercel wakes this job once daily; this time controls which syncs are due during that run.
      </p>
    </div>
    <div className="sm:col-span-2">
      <label
        htmlFor="google-sheet-sync-timezone"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Sync Timezone
      </label>
      <select
        id="google-sheet-sync-timezone"
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        value={draft.sync_timezone}
        onChange={(event) => updateDraft({ sync_timezone: event.target.value })}
      >
        {TIMEZONE_OPTIONS.map((timezone) => (
          <option key={timezone.value} value={timezone.value}>
            {timezone.label} ({timezone.value})
          </option>
        ))}
      </select>
    </div>
  </div>
);

export default SheetScheduleFields;
