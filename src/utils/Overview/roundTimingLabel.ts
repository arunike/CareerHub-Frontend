import dayjs from 'dayjs';
import type { RoundTiming } from './overview';

const onDay = (iso: string) => dayjs(iso).format('D MMM');

// Ghosted replaces the dates rather than joining them: the point is that nothing is scheduled.
export const roundTimingLabel = ({ interviewOn, heardOn, ghosted }: RoundTiming) => {
  if (ghosted) return heardOn ? `Ghosted · no reply since ${onDay(heardOn)}` : 'Ghosted';
  const parts = [
    interviewOn ? `Interview ${onDay(interviewOn)}` : null,
    heardOn ? `Heard ${onDay(heardOn)}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No date recorded';
};
