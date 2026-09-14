import type React from 'react';
import { Button, Input } from 'antd';

const { TextArea } = Input;
import type { SchedulePhase } from '../../types';

type Props = {
  handleQuickImport: () => void;
  importDefaultsSummary: string;
  local: SchedulePhase[];
  quickImportText: string;
  setQuickImportText: React.Dispatch<React.SetStateAction<string>>;
  setShowQuickImport: React.Dispatch<React.SetStateAction<boolean>>;
};

const SchedulePhaseQuickImport = ({
  handleQuickImport,
  importDefaultsSummary,
  local,
  quickImportText,
  setQuickImportText,
  setShowQuickImport,
}: Props) => (
  <div className="border border-amber-200 dark:border-amber-500/25 rounded-xl bg-amber-50/40 dark:bg-amber-500/10 p-4 space-y-3">
    <div>
      <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Quick Import Weekly Schedule
      </div>
      <div className="mt-1 text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
        Paste weekly timesheet text with `Week`, `Date`, `Hours`, and `Overtime Hours`. We&apos;ll
        merge consecutive weeks that share the same schedule into phases and keep exact total +
        overtime hours from the import.
      </div>
      {importDefaultsSummary && (
        <div className="mt-2 text-xs text-amber-700/80 dark:text-amber-300">
          Imported phases will use this role&apos;s saved defaults: {importDefaultsSummary}.
        </div>
      )}
      {local.length > 0 && (
        <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-300">
          Generating phases here replaces the unsaved phases currently shown in this modal.
        </div>
      )}
    </div>
    <TextArea
      rows={12}
      value={quickImportText}
      onChange={(event) => setQuickImportText(event.target.value)}
      placeholder={
        'Week 1\nDate    Hours    Overtime Hours\n08/22   8        2.71\n08/23   8        2.02\n...'
      }
    />
    <div className="flex justify-end gap-2">
      <Button onClick={() => setShowQuickImport(false)}>Cancel Import</Button>
      <Button type="primary" onClick={handleQuickImport} disabled={!quickImportText.trim()}>
        Generate Phases
      </Button>
    </div>
  </div>
);

export default SchedulePhaseQuickImport;
