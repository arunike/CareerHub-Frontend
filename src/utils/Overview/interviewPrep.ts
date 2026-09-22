export interface DebriefLike {
  id: number;
  stage?: string | null;
  interview_date?: string | null;
  weak_areas?: string | null;
  next_steps?: string | null;
}

export interface InterviewPrep {
  stage: string;
  interviewDate: string | null;
  nextSteps: string;
  weakAreas: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// The round you already sat is what there is to revise; a debrief dated ahead is not one of those.
export const prepFromDebriefs = (
  debriefs: DebriefLike[],
  todayIso: string
): InterviewPrep | null => {
  const past = debriefs.filter((entry) => {
    const date = text(entry.interview_date);
    return date === '' || date <= todayIso;
  });
  if (past.length === 0) return null;

  const latest = [...past].sort((a, b) => {
    const byDate = text(a.interview_date).localeCompare(text(b.interview_date));
    return byDate !== 0 ? byDate : a.id - b.id;
  })[past.length - 1];

  const nextSteps = text(latest.next_steps);
  const weakAreas = text(latest.weak_areas);
  // Nothing worth revising is not a prompt; an empty note reads as a broken card.
  if (nextSteps === '' && weakAreas === '') return null;

  return {
    stage: text(latest.stage),
    interviewDate: text(latest.interview_date) || null,
    nextSteps,
    weakAreas,
  };
};
