import type { GoogleSpreadsheetTab } from '../../types';
import EditableNumberInput from '../../components/EditableNumberInput';
import type { Draft } from './sheetMapping';

type Props = {
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
  worksheetTabs: GoogleSpreadsheetTab[];
  worksheetTabsLoading: boolean;
};

const SheetSyncBehaviorFields = ({
  draft,
  updateDraft,
  worksheetTabs,
  worksheetTabsLoading,
}: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="sm:col-span-2">
      <label
        htmlFor="google-sheet-sync-worksheet"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Worksheet Tab
      </label>
      {worksheetTabs.length > 0 ? (
        <>
          <select
            id="google-sheet-sync-worksheet"
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={draft.worksheet_name || worksheetTabs[0]?.title || ''}
            onChange={(event) => updateDraft({ worksheet_name: event.target.value })}
            disabled={worksheetTabsLoading}
          >
            {worksheetTabs.map((tab) => (
              <option key={tab.id} value={tab.title}>
                {tab.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {worksheetTabs.length === 1
              ? 'Using the only worksheet tab in this spreadsheet.'
              : `${worksheetTabs.length} worksheet tabs found. Pick the one to sync.`}
          </p>
        </>
      ) : (
        <input
          id="google-sheet-sync-worksheet"
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          value={draft.worksheet_name}
          onChange={(event) => updateDraft({ worksheet_name: event.target.value })}
          placeholder={worksheetTabsLoading ? 'Loading tabs...' : 'Sheet1'}
        />
      )}
    </div>
    <div>
      <label
        htmlFor="google-sheet-sync-header-row"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Header Row
      </label>
      <EditableNumberInput
        id="google-sheet-sync-header-row"
        min={1}
        value={draft.header_row}
        fallbackValue={1}
        onCommit={(value) => updateDraft({ header_row: value })}
      />
    </div>
  </div>
);

export default SheetSyncBehaviorFields;
