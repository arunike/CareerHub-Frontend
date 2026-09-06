import { LinkOutlined } from '@ant-design/icons';
import type { GoogleOAuthStatus, GoogleSpreadsheetFile } from '../../types';
import type { Draft } from './sheetMapping';

type Props = {
  draft: Draft;
  googleStatus: GoogleOAuthStatus | null;
  selectSpreadsheet: (url: string) => void;
  spreadsheets: GoogleSpreadsheetFile[];
  spreadsheetsLoading: boolean;
  updateDraft: (patch: Partial<Draft>) => void;
};

const SheetTargetPicker = ({
  draft,
  googleStatus,
  selectSpreadsheet,
  spreadsheets,
  spreadsheetsLoading,
  updateDraft,
}: Props) => (
  <div className="space-y-3">
    {googleStatus?.connected && googleStatus.can_list_spreadsheets && (
      <div>
        <label
          htmlFor="google-sheet-sync-source"
          className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"
        >
          Choose from Google Sheets
        </label>
        <select
          id="google-sheet-sync-source"
          className="min-h-11 w-full rounded-lg border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          value={spreadsheets.some((sheet) => sheet.url === draft.sheet_url) ? draft.sheet_url : ''}
          onChange={(event) => selectSpreadsheet(event.target.value)}
          disabled={spreadsheetsLoading}
        >
          <option value="">
            {spreadsheetsLoading ? 'Loading sheets...' : 'Select a spreadsheet'}
          </option>
          {spreadsheets.map((sheet) => (
            <option key={sheet.id} value={sheet.url}>
              {sheet.name}
            </option>
          ))}
        </select>
      </div>
    )}
    <div>
      <label
        htmlFor="google-sheet-sync-url"
        className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1"
      >
        Google Sheet Link
      </label>
      <div className="relative">
        <LinkOutlined
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-ink-500"
        />
        <input
          id="google-sheet-sync-url"
          type="url"
          className="min-h-11 w-full rounded-lg border border-gray-300 dark:border-white/[0.12] py-2 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={draft.sheet_url}
          onChange={(event) => updateDraft({ sheet_url: event.target.value })}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
      </div>
    </div>
  </div>
);

export default SheetTargetPicker;
