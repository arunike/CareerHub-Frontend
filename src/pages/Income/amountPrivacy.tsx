import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { money, moneyCents, signedMoney } from './format';

// Wide enough to read as a hidden figure without collapsing the column it sits in.
const MASK = '••••••';

interface AmountFormatters {
  hidden: boolean;
  money: (value: number) => string;
  moneyCents: (value: number) => string;
  signedMoney: (value: number) => string;
}

const PLAIN: AmountFormatters = { hidden: false, money, moneyCents, signedMoney };
const MASKED: AmountFormatters = {
  hidden: true,
  money: () => MASK,
  moneyCents: () => MASK,
  signedMoney: () => MASK,
};

const AmountPrivacyContext = createContext<AmountFormatters>(PLAIN);

export const AmountPrivacyProvider = ({
  hidden,
  children,
}: {
  hidden: boolean;
  children: ReactNode;
}) => {
  const value = useMemo(() => (hidden ? MASKED : PLAIN), [hidden]);
  return <AmountPrivacyContext.Provider value={value}>{children}</AmountPrivacyContext.Provider>;
};

// Percentages and counts stay readable; only amounts are hidden.
export const useMoney = () => useContext(AmountPrivacyContext);
