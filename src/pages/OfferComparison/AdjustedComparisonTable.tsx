import RowActions from '../../components/RowActions';
import type { ScenarioRow } from './offerAdjustmentsTypes';
import { formatTimeOffSummary } from '../../utils/offerTimeOff';

type Props = {
  scenarioRows: ScenarioRow[];
  onOpenScenarioEditor: (scenarioId: string, mode: 'view' | 'edit') => void;
  onRemoveScenarioOffer: (id: string) => void;
  onViewRealOffer?: (offerId: number) => void;
  onEditRealOffer?: (offerId: number) => void;
};

const AdjustedComparisonTable = ({
  scenarioRows,
  onOpenScenarioEditor,
  onRemoveScenarioOffer,
  onViewRealOffer,
  onEditRealOffer,
}: Props) => (
  <div className="rounded-lg border border-gray-200 overflow-hidden">
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800">Adjusted Comparison</h4>
      <p className="text-xs text-gray-500 mt-1">
        Real and custom offers ranked by adjusted value under current assumptions.
      </p>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-white">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Offer</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">COL</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rent / Mo</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax (B/Bn/Eq)</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Base / Bonus / Equity (After Tax)
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Category Deltas
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Time Off
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Adjusted Value
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Adj Diff vs Current
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {scenarioRows.map((row) => {
            const isCurrent = !!row.offer.is_current;
            return (
              <tr key={`${row.kind}-${String(row.offer.id ?? row.appName)}`} className={isCurrent ? 'bg-blue-50' : ''}>
                <td className="px-4 py-2 text-sm">
                  <div className="font-medium text-gray-900">{row.appName}</div>
                  <div className="text-xs text-gray-500">{row.kind === 'real' ? 'Real Offer' : 'Custom Offer'}</div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">{row.locationLabel}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{Math.round(row.colIndex)}</td>
                <td className="px-4 py-2 text-sm text-gray-700">${Math.round(row.monthlyRent).toLocaleString()}</td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  {Math.round(row.usedBaseTaxRate)}% / {Math.round(row.usedBonusTaxRate)}% /{' '}
                  {Math.round(row.usedEquityTaxRate)}%
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  ${Math.round(row.afterTaxBase).toLocaleString()} / ${Math.round(row.afterTaxBonus).toLocaleString()} / $
                  {Math.round(row.afterTaxEquity).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-xs text-gray-700">
                  {isCurrent ? (
                    <span className="text-gray-400">-</span>
                  ) : (
                    <>
                      <div>
                        TC:{' '}
                        <span className={row.deltaTotalComp >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {row.deltaTotalComp >= 0 ? '+' : ''}${Math.round(row.deltaTotalComp).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        Base:{' '}
                        <span className={row.deltaBaseAfterTax >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {row.deltaBaseAfterTax >= 0 ? '+' : ''}${Math.round(row.deltaBaseAfterTax).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        Bonus:{' '}
                        <span className={row.deltaBonusAfterTax >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {row.deltaBonusAfterTax >= 0 ? '+' : ''}${Math.round(row.deltaBonusAfterTax).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        Equity:{' '}
                        <span className={row.deltaEquityAfterTax >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {row.deltaEquityAfterTax >= 0 ? '+' : ''}${Math.round(row.deltaEquityAfterTax).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-gray-700">
                  <div className="font-medium text-gray-800">
                    {row.is_unlimited_pto ? 'Unlimited PTO' : `${Math.round(row.pto_holiday_days ?? 0)} days`}
                  </div>
                  {!isCurrent && row.deltaPtoHolidayDays != null && (
                    <div className={row.deltaPtoHolidayDays >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {row.deltaPtoHolidayDays >= 0 ? '+' : ''}
                      {Math.round(row.deltaPtoHolidayDays)} days vs current
                    </div>
                  )}
                  {!isCurrent && row.deltaPtoHolidayDays == null && (
                    <div className="text-amber-600">Unlimited PTO is not normalized into a day delta</div>
                  )}
                  <div className="text-gray-400">
                    {formatTimeOffSummary({
                      ptoDays: row.pto_days,
                      holidayDays: row.holiday_days,
                      isUnlimitedPto: row.is_unlimited_pto,
                    })}
                  </div>
                </td>
                <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                  ${Math.round(row.adjustedValue).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm font-semibold">
                  {isCurrent ? (
                    <span className="text-gray-400">-</span>
                  ) : (
                    <span className={row.deltaVsCurrent >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {row.deltaVsCurrent >= 0 ? '+' : ''}${Math.round(row.deltaVsCurrent).toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  {row.kind === 'simulated' ? (
                    <RowActions
                      size="small"
                      onView={() => onOpenScenarioEditor(String(row.offer.id), 'view')}
                      onEdit={() => onOpenScenarioEditor(String(row.offer.id), 'edit')}
                      onDelete={() => onRemoveScenarioOffer(String(row.offer.id))}
                      deleteTitle="Remove custom offer?"
                      deleteDescription="This will remove this custom offer from adjusted comparison."
                    />
                  ) : Number.isFinite(Number(row.offer.id)) ? (
                    <RowActions
                      size="small"
                      onView={onViewRealOffer ? () => onViewRealOffer(Number(row.offer.id)) : undefined}
                      onEdit={onEditRealOffer ? () => onEditRealOffer(Number(row.offer.id)) : undefined}
                      onDelete={() => {}}
                      disableDelete
                      deleteButtonTooltip={
                        isCurrent
                          ? 'Current offer cannot be deleted here. Unmark current first, then delete in Job Applications.'
                          : 'Delete real offers from Job Applications page.'
                      }
                    />
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default AdjustedComparisonTable;
