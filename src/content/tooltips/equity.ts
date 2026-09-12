// Equity and one-off pay, where the value depends on whether it can be realised.
export const EQUITY_TOOLTIPS = {
  equityLiquidity:
    'Whether you could turn the equity into cash. Freely tradable counts in full; a company buyback counts at the internal price; not sellable counts as nothing, because paper value you cannot realise should not rank an offer above one that pays cash.',
  equityTicker:
    'The ticker, for a public company. Enter it and the current price can be fetched and shared across every offer at that company.',
  equityShares:
    'How many shares the grant is. Shares and grant price float against the recorded grant total, so entering either one works out the other.',
  equityGrantPrice:
    'The share price the grant was priced at when it was offered. Used with the current price to work out how much the grant has moved.',
  equityCurrentPrice:
    'Today’s share price. It revalues the grant without changing what you were offered, so a grant that has risen is not mistaken for a bigger offer.',
  signOn:
    'A one-off payment for joining. It is counted at a quarter of its value per year over four years, so a cheque cannot rank like a raise.',
  annualGrantValue:
    'Annualized grant value. Financial scoring counts the full value when it is tradable, the entered buyback value when a company buyback exists, and nothing while it is not sellable. Tax applies only to the realizable amount.',
} as const;
