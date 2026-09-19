export interface BonusMoveCostInput {
  // After-tax bonus the role being left would have paid for the year already in progress.
  forfeited: number;
  isMove: boolean;
}

export interface BonusMoveCost {
  forfeited: number;
  // Positive is a cost. Charged once, through the same bucket as a sign-on.
  net: number;
}

// Leaving mid-cycle forfeits the bonus in progress, which no other part of the model counts.
export const bonusMoveCost = ({ forfeited, isMove }: BonusMoveCostInput): BonusMoveCost => {
  if (!isMove) return { forfeited: 0, net: 0 };
  return { forfeited, net: forfeited };
};
