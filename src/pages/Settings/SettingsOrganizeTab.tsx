import type { ReactNode } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { UserSettings } from '../../types';
import type { ColorConflict } from '../../utils/colorConflicts';
import EventCategoriesSection from './EventCategoriesSection';
import EmploymentTypesSection from './EmploymentTypesSection';
import CategoriesSection from './CategoriesSection';
import ApplicationStagesSection from './ApplicationStagesSection';
import IncomeVisibilitySection from './IncomeVisibilitySection';
import type { useEventCategoryEditor } from './useEventCategoryEditor';
import type { useEmploymentTypeEditor } from './useEmploymentTypeEditor';
import type { useHolidayTabEditor } from './useHolidayTabEditor';
import type { useAppStageEditor } from './useAppStageEditor';

// Each section takes its editor hook wholesale; only page-wide values are named.
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

    <IncomeVisibilitySection
      hiddenRoles={settings?.hidden_income_roles ?? []}
      hiddenYears={settings?.hidden_income_years ?? []}
      onHiddenRolesChange={(hidden_income_roles) =>
        setSettings((prev) => (prev ? { ...prev, hidden_income_roles } : prev))
      }
      onHiddenYearsChange={(hidden_income_years) =>
        setSettings((prev) => (prev ? { ...prev, hidden_income_years } : prev))
      }
    />
  </>
);

export default SettingsOrganizeTab;
