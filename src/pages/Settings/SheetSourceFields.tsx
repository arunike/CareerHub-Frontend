import type { GoogleSheetSyncTarget } from '../../types';
import type { Draft } from './sheetMapping';

type Props = {
  changeTarget: (targetType: GoogleSheetSyncTarget) => void;
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
};

const SheetSourceFields = ({ changeTarget, draft, updateDraft }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label
        htmlFor="google-sheet-sync-name"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Sync Name
      </label>
      <input
        id="google-sheet-sync-name"
        className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        value={draft.name}
        onChange={(event) => updateDraft({ name: event.target.value })}
        placeholder="Applications pipeline"
      />
    </div>
    <div>
      <label
        htmlFor="google-sheet-sync-functionality"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Functionality
      </label>
      <select
        id="google-sheet-sync-functionality"
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        value={draft.target_type}
        onChange={(event) => changeTarget(event.target.value as GoogleSheetSyncTarget)}
      >
        <option value="APPLICATIONS">Applications</option>
        <option value="EVENTS">Events</option>
      </select>
    </div>
  </div>
);

export default SheetSourceFields;
