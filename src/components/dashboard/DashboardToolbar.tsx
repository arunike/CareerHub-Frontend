import { SettingOutlined } from '@ant-design/icons';
import { SECTION_LABEL_CLASS } from '../inputs/formControls';

export const DashboardToolbar = ({
  widgetCount,
  onCustomize,
}: {
  widgetCount: number;
  onCustomize: () => void;
}) => (
  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p className={SECTION_LABEL_CLASS}>
      {widgetCount} widget{widgetCount === 1 ? '' : 's'} enabled
    </p>
    <button
      type="button"
      onClick={onCustomize}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[9px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-sm font-medium text-slate-600 dark:text-ink-200 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-ink-50 sm:h-[38px] sm:min-h-0 sm:w-auto"
    >
      <SettingOutlined />
      Customize view
    </button>
  </div>
);

export default DashboardToolbar;
