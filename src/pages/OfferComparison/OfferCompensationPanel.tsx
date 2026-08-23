import type { OfferFormFieldsProps } from './OfferFormFields';
import { DollarOutlined } from '@ant-design/icons';
import { CompensationSection } from './sections';
import OfferFormSection from './components/OfferFormSection';

type Props = OfferFormFieldsProps & {
  effectiveEquityVestingPercent: number;
  isActiveSection: (id: string) => boolean;
  sectionIds: Record<string, string>;
  setEquityVestingPercentInternal: React.Dispatch<React.SetStateAction<number>>;
};

const OfferCompensationPanel = ({
  effectiveEquityVestingPercent,
  isActiveSection,
  sectionIds,
  setEquityVestingPercentInternal,
  annualRefreshValue,
  baseSalary,
  bonus,
  defaultEquityMode,
  equity,
  equityBuybackValue,
  equityLiquidity,
  equityTotalGrant,
  equityVestingSchedule,
  onAnnualRefreshValueChange,
  onBaseSalaryChange,
  onBonusChange,
  onEquityBuybackValueChange,
  onEquityChange,
  onEquityLiquidityChange,
  onEquityTotalGrantChange,
  onEquityVestingPercentChange,
  onEquityVestingScheduleChange,
  onRefreshStartsYearChange,
  onRelocationBonusChange,
  onSignOnChange,
  onSignOnScheduleChange,
  refreshStartsYear,
  relocationBonus,
  signOn,
  signOnSchedule = [],
}: Props) => (
  <div
    role="tabpanel"
    aria-labelledby={`${sectionIds.compensation}-tab`}
    hidden={!isActiveSection(sectionIds.compensation)}
  >
    <OfferFormSection
      id={sectionIds.compensation}
      title="Compensation"
      description="Separate guaranteed cash from equity you can actually realize. The score uses these values differently."
      icon={<DollarOutlined />}
    >
      <CompensationSection
        baseSalary={baseSalary}
        onBaseSalaryChange={onBaseSalaryChange}
        bonus={bonus}
        onBonusChange={onBonusChange}
        equity={equity}
        onEquityChange={onEquityChange}
        equityLiquidity={equityLiquidity}
        onEquityLiquidityChange={onEquityLiquidityChange}
        equityBuybackValue={equityBuybackValue}
        onEquityBuybackValueChange={onEquityBuybackValueChange}
        equityTotalGrant={equityTotalGrant}
        annualRefreshValue={annualRefreshValue}
        onAnnualRefreshValueChange={onAnnualRefreshValueChange}
        refreshStartsYear={refreshStartsYear}
        onRefreshStartsYearChange={onRefreshStartsYearChange}
        onEquityTotalGrantChange={onEquityTotalGrantChange}
        effectiveEquityVestingPercent={effectiveEquityVestingPercent}
        setEquityVestingPercentInternal={setEquityVestingPercentInternal}
        onEquityVestingPercentChange={onEquityVestingPercentChange}
        equityVestingSchedule={equityVestingSchedule}
        onEquityVestingScheduleChange={onEquityVestingScheduleChange}
        defaultEquityMode={defaultEquityMode}
        signOn={signOn}
        onSignOnChange={onSignOnChange}
        signOnSchedule={signOnSchedule}
        onSignOnScheduleChange={onSignOnScheduleChange ?? (() => {})}
        relocationBonus={relocationBonus}
        onRelocationBonusChange={onRelocationBonusChange}
      />
    </OfferFormSection>
  </div>
);

export default OfferCompensationPanel;
