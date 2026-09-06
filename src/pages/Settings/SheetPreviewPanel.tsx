import type { GoogleSheetSyncPreview } from '../../types';

type Props = {
  preview: GoogleSheetSyncPreview;
};

const SheetPreviewPanel = ({ preview }: Props) => (
  <div className="bg-white dark:bg-ink-900 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm space-y-3">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-ink-50">Sheet Preview</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-ink-400 border-b">
            {preview.headers.map((header) => (
              <th key={header} className="py-2 pr-4 font-medium whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row, index) => (
            <tr key={index} className="border-b last:border-b-0">
              {preview.headers.map((header) => (
                <td
                  key={header}
                  className="py-2 pr-4 text-gray-700 dark:text-ink-100 whitespace-nowrap"
                >
                  {row[header] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default SheetPreviewPanel;
