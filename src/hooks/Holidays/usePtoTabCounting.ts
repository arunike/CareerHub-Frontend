import type React from 'react';
import { message } from 'antd';
import { updateUserSettings } from '../../api';
import type { UserSettings } from '../../types';
import { UNTABBED_KEY } from '../../utils/TimeOff/ptoTabs';

// The untabbed bucket is an account field; every other tab carries the flag in `holiday_tabs`.
export const usePtoTabCounting = ({
  userSettings,
  setUserSettings,
}: {
  userSettings: UserSettings | null;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}) => {
  const setTabCharges = async (tabId: string, charges: boolean) => {
    if (!userSettings) return;
    const patch: Partial<UserSettings> =
      tabId === UNTABBED_KEY
        ? { default_holiday_counts_as_pto: charges }
        : {
            holiday_tabs: (userSettings.holiday_tabs ?? []).map((tab) =>
              tab.id === tabId ? { ...tab, counts_as_pto: charges } : tab
            ),
          };
    const previous = userSettings;
    setUserSettings({ ...userSettings, ...patch });
    try {
      await updateUserSettings(patch);
    } catch {
      setUserSettings(previous);
      message.error('Could not save whether this tab charges PTO.');
    }
  };

  return { setTabCharges };
};
