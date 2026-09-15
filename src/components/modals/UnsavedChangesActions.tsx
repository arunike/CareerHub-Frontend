import { Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

interface Props {
  isDirty: boolean;
  saving?: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
}

const Dot = () => (
  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" aria-hidden />
);

// Three controls in the header row wrapped Save onto its own line, so a phone gets its own bar.
export const UnsavedChangesActions = ({
  isDirty,
  saving = false,
  onDiscard,
  onSave,
  saveLabel = 'Save',
}: Props) => (
  <>
    {/* A rule divides the view controls from the save actions, which are otherwise one flat row. */}
    <div className="hidden items-center gap-2 sm:flex">
      <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-200 dark:bg-white/[0.12]" aria-hidden />
      {isDirty ? (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-amber-600 dark:text-amber-400">
          <Dot />
          Unsaved
        </span>
      ) : null}
      {/* Text, not a box: only the primary action earns a filled button in this row. */}
      {isDirty ? (
        <Button type="text" size="large" className="toolbar-btn !px-3" onClick={onDiscard}>
          Discard
        </Button>
      ) : null}
      <Button
        className="toolbar-btn"
        size="large"
        type="primary"
        icon={<SaveOutlined />}
        loading={saving}
        disabled={!isDirty}
        onClick={onSave}
      >
        {saveLabel}
      </Button>
    </div>

    {isDirty ? (
      <div
        // Under the nav's z so it can never cover the tabs, and clear of the home indicator.
        className="fixed inset-x-0 z-[900] border-t border-amber-200/80 bg-white px-4 py-3 shadow-[0_-16px_40px_-32px_rgba(15,23,42,0.6)] sm:hidden dark:border-amber-500/25 dark:bg-ink-900"
        style={{ bottom: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))' }}
        role="region"
        aria-label="Unsaved changes"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Dot />
            <span className="truncate">Unsaved changes</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <Button size="middle" onClick={onDiscard}>
              Discard
            </Button>
            <Button
              type="primary"
              size="middle"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={onSave}
            >
              {saveLabel}
            </Button>
          </span>
        </div>
      </div>
    ) : null}
  </>
);

export default UnsavedChangesActions;
