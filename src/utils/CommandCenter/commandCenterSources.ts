export const SOURCE_LABELS = {
  events: 'Events',
  applications: 'Applications',
  tasks: 'Tasks',
  offers: 'Offers',
  journals: 'Decision journals',
  settings: 'Stage names',
} as const;

export type CommandSource = keyof typeof SOURCE_LABELS;

// Which cards are affected, so the banner says what is missing rather than that "something" failed.
export const SOURCE_AFFECTS: Record<CommandSource, string> = {
  events: 'upcoming events and deadlines',
  applications: 'live conversations and pipeline',
  tasks: 'open and overdue tasks',
  offers: 'offers and their deadlines',
  journals: 'decision reviews due',
  settings: 'your configured stage names',
};

const list = (labels: string[]) =>
  labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;

// Named, because "something went wrong" leaves you unable to tell which numbers to distrust.
export const unavailableMessage = (failed: CommandSource[]): string | null => {
  if (failed.length === 0) return null;
  const affected = list(failed.map((source) => SOURCE_AFFECTS[source]));
  return failed.length === 1
    ? `${SOURCE_LABELS[failed[0]]} could not be loaded, so ${affected} are missing below.`
    : `${failed.length} sources could not be loaded, so ${affected} are missing below.`;
};

// The all-clear is only honest when every source answered.
export const canSayAllClear = (failed: CommandSource[]) => failed.length === 0;
