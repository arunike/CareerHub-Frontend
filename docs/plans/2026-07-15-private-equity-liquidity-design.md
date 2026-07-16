# Private-company equity liquidity

## Decision

Use an explicit three-state liquidity model for every real and simulated offer:

- `LIQUID`: the annual granted equity is realizable and fully counted.
- `BUYBACK`: only the entered annual company-buyback value is counted.
- `ILLIQUID`: the grant remains visible as paper equity, but zero is counted.

A single frontend helper derives realizable equity. Adjusted value, financial score, total-comp comparisons, the chart, and the compensation simulator consume that derived value. The original annual grant remains unchanged for display, negotiation context, and future valuation.

## UI

The shared offer form places an Equity Liquidity control immediately below the existing equity/vesting inputs. Buyback mode reveals one annual buyback-value input. Context copy states exactly what amount is counted.

Scorecards continue to show the annual grant, then label it as liquid, buyback-backed, or paper equity. Illiquid grants explicitly show `$0 counted`; buyback grants show the realizable annual amount and its after-tax value.

## Persistence and compatibility

Real offers store `equity_liquidity` and `equity_buyback_value` in Django. Existing rows default to `LIQUID`, preserving current calculations. Simulated offers persist the same fields in the existing local adjustment payload. The production migration uses the repository's conditional add-column pattern for hosted PostgreSQL compatibility.

## Verification

Add API round-trip coverage for the new fields. Verify fresh migrations, focused and full Career API tests, frontend lint/format/type/build, and calculation call sites for real and simulated offers.
