export interface PositionedRow {
  periodIndex: number;
  isOffCycle?: boolean;
}

export interface PaycheckPosition {
  position: number;
  total: number;
}

// Where a cheque sits among the ones this role pays, not its slot in the calendar year.
export const scheduledPosition = (rows: PositionedRow[], periodIndex: number): PaycheckPosition => {
  const scheduled = rows.filter((row) => !row.isOffCycle);
  const found = scheduled.findIndex((row) => row.periodIndex === periodIndex);
  return { position: found + 1, total: scheduled.length };
};
