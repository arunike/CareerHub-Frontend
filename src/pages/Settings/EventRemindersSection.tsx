import { SECTION_ICONS, SettingsSection } from './settingsChrome';
import { type ReminderSettings } from '../../utils/eventReminders';
import UnitNumberInput from '../../components/UnitNumberInput';

type Props = {
  patchReminders: (patch: Partial<ReminderSettings>) => void;
  reminderSettings: ReminderSettings;
};

const EventRemindersSection = ({ patchReminders, reminderSettings }: Props) => (
  <SettingsSection
    id="event-reminders"
    icon={SECTION_ICONS.reminders}
    title="Event Reminders"
    description="How the notification bell nudges you about upcoming events."
  >
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label
          htmlFor="settings-reminder-start"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Start reminding, days before
        </label>
        <UnitNumberInput
          id="settings-reminder-start"
          unit="days"
          min={1}
          max={60}
          value={reminderSettings.startDaysBefore}
          onChange={(value) => patchReminders({ startDaysBefore: value ?? 1 })}
        />
      </div>
      <div>
        <label
          htmlFor="settings-reminder-repeat"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Remind again after
        </label>
        <UnitNumberInput
          id="settings-reminder-repeat"
          unit="days"
          min={1}
          max={30}
          value={reminderSettings.repeatEveryDays}
          onChange={(value) => patchReminders({ repeatEveryDays: value ?? 1 })}
        />
        <p className="mt-1 text-xs text-gray-400">How long a dismissed reminder stays hidden.</p>
      </div>
      <div>
        <label
          htmlFor="settings-reminder-duration"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Popup stays for
        </label>
        <UnitNumberInput
          id="settings-reminder-duration"
          unit="sec"
          min={0}
          max={120}
          value={reminderSettings.toastDurationSeconds}
          onChange={(value) => patchReminders({ toastDurationSeconds: value ?? 0 })}
        />
        <p className="mt-1 text-xs text-gray-400">Use 0 to keep it on screen until you close it.</p>
      </div>
    </div>

    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={reminderSettings.allowForeverIgnore}
        onChange={(e) => patchReminders({ allowForeverIgnore: e.target.checked })}
      />
      <span>
        Offer &ldquo;Never remind me&rdquo;
        <span className="block text-xs text-gray-400">
          Adds a permanent mute alongside Dismiss on each reminder.
        </span>
      </span>
    </label>
  </SettingsSection>
);

export default EventRemindersSection;
