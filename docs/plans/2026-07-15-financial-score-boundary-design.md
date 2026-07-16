# Financial score boundary

## Decision

Financial scoring includes compensation, taxes, cost of living, rent, and direct annual cash effects such as commute costs and employer-provided food. It does not assign a dollar bonus or penalty to Remote, Hybrid, Onsite, or RTO days.

Remote and RTO preferences remain visible in the dedicated Location and WLB categories. This prevents the same preference from affecting both Financial and qualitative category scores.

## Calculation

The cash adjustment is:

`annual free-food value - annual commute cost`

Adjusted value remains:

`purchasing-power-adjusted after-tax value + cash adjustment - annual rent`

The scorecard calculation detail names this value `Cash adjustments` and explicitly states that Remote/RTO preferences are scored under Location and WLB.

## Compatibility

No persisted API fields or migrations change. Real offers, simulated offers, decision scorecards, and saved adjusted metrics all consume the same shared calculation function.
