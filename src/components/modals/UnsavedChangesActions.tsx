import { Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

interface Props {
  isDirty: boolean;
  saving?: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
}

// A pill rather than text: the old indicator was hidden below sm, so a phone showed nothing.
export const UnsavedChangesActions = ({
  isDirty,
  saving = false,
  onDiscard,
  onSave,
  saveLabel = 'Save',
}: Props) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    {isDirty ? (
      <>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
          Unsaved
        </span>
        <Button size="small" onClick={onDiscard}>
          Discard
        </Button>
      </>
    ) : null}
    <Button
      type="primary"
      icon={<SaveOutlined />}
      loading={saving}
      disabled={!isDirty}
      onClick={onSave}
    >
      {saveLabel}
    </Button>
  </div>
);

export default UnsavedChangesActions;
