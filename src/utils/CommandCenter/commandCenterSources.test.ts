import { describe, expect, it } from 'vitest';
import { canSayAllClear, unavailableMessage } from './commandCenterSources';

describe('unavailableMessage', () => {
  it('says nothing when every source answered', () => {
    expect(unavailableMessage([])).toBeNull();
  });

  it('names the source and what is missing because of it', () => {
    expect(unavailableMessage(['tasks'])).toBe(
      'Tasks could not be loaded, so open and overdue tasks are missing below.'
    );
  });

  it('lists several readably rather than as a comma run', () => {
    expect(unavailableMessage(['events', 'tasks', 'offers'])).toBe(
      '3 sources could not be loaded, so upcoming events and deadlines, open and overdue tasks and offers and their deadlines are missing below.'
    );
  });
});

describe('canSayAllClear', () => {
  it('is the whole point: reassurance needs every source to have answered', () => {
    expect(canSayAllClear([])).toBe(true);
    expect(canSayAllClear(['tasks'])).toBe(false);
  });
});
