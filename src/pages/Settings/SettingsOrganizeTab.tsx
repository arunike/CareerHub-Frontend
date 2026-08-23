import type { ReactNode } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { UserSettings } from '../../types';
import type { ColorConflict } from '../../utils/colorConflicts';
import EventCategoriesSection from './EventCategoriesSection';
import EmploymentTypesSection from './EmploymentTypesSection';
import CategoriesSection from './CategoriesSection';
import ApplicationStagesSection from './ApplicationStagesSection';
import type { useEventCategoryEditor } from './useEventCategoryEditor';
import type { useEmploymentTypeEditor } from './useEmploymentTypeEditor';
import type { useHolidayTabEditor } from './useHolidayTabEditor';
import type { useAppStageEditor } from './useAppStageEditor';

// Each section takes its editor hook's return value wholesale; only the page-wide values
// (lock state, settings, colour conflicts) are threaded in by name.
type Props = {
  categoryEditor: ReturnType<typeof useEventCategoryEditor>;
  empTypeEditor: ReturnType<typeof useEmploymentTypeEditor>;
  holidayTabEditor: ReturnType<typeof useHolidayTabEditor>;
  appStageEditor: ReturnType<typeof useAppStageEditor>;
  isLocked: boolean;
  messageApi: MessageInstance;
  settings: UserSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  colorConflicts: ColorConflict[];
  renderClashNotice: (
    color: string | null | undefined,
    excluding?: { kind: 'category' | 'holiday'; label: string }
  ) => ReactNode;
  freeColorSuggestion: string | null;
};

const SettingsOrganizeTab = ({
  categoryEditor,
  empTypeEditor,
  holidayTabEditor,
  appStageEditor,
  isLocked,
  messageApi,
  settings,
  setSettings,
  colorConflicts,
  renderClashNotice,
  freeColorSuggestion,
}: Props) => (
  <>
    <EventCategoriesSection
      {...categoryEditor}
      isLocked={isLocked}
      messageApi={messageApi}
      renderClashNotice={renderClashNotice}
    />

    <EmploymentTypesSection
      {...empTypeEditor}
      isLocked={isLocked}
      settings={settings}
      setSettings={setSettings}
    />

    <CategoriesSection
      {...holidayTabEditor}
      colorConflicts={colorConflicts}
      freeColorSuggestion={freeColorSuggestion}
      renderClashNotice={renderClashNotice}
      settings={settings}
      setSettings={setSettings}
    />

    <ApplicationStagesSection
      {...appStageEditor}
      isLocked={isLocked}
      settings={settings}
      setSettings={setSettings}
    />
  </>
);

export default SettingsOrganizeTab;
