import { Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

interface Props {
  isDirty: boolean;
  saving?: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
}

// The old indicator was grey text hidden below sm, so on a phone nothing said the work was
// unsaved at all. A tinted pill with a dot reads at a glance and survives the narrow layout.
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
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
