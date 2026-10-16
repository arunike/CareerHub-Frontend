import type { MessageInstance } from 'antd/es/message/interface';
import { getUserSettings, updateUserSettings } from '../../api';
import type { Holiday } from '../../types';
import { ignoreListAfter } from '../../utils/Holidays/observance';

export const useObservance = ({
  fetchData,
  messageApi,
}: {
  fetchData: () => Promise<void> | void;
  messageApi: MessageInstance;
}) => {
  // Read before write: the list covers every year, so rebuilding it from one year's rows loses entries.
  const toggleObservance = async (holiday: Holiday, observed: boolean) => {
    try {
      const { data } = await getUserSettings();
      const stored: string[] = data?.ignored_observed_holidays ?? [];
      await updateUserSettings({
        ignored_observed_holidays: ignoreListAfter(
          stored,
          holiday.description,
          holiday.date,
          observed
        ),
      });
      messageApi.success(`${holiday.description} is now ${observed ? 'observed' : 'ignored'}`);
      await fetchData();
    } catch {
      messageApi.error('Could not change whether this holiday is observed');
    }
  };

  return { toggleObservance };
};
