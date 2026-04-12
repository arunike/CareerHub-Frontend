import clsx from 'clsx';
import type { ApplicationLike as Application, OfferLike as Offer } from './calculations';
import type { AdjustedOfferMetrics } from './types';
import { formatPtoLabel } from '../../utils/offerTimeOff';

type Props = {
  offers: Offer[];
  filteredOffers: Offer[];
  applicationsById: Record<number, Application | undefined>;
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>;
  onEditClick: (offer: Offer) => void;
  onToggleCurrent: (offer: Offer) => void;
  onNegotiateClick: (offer: Offer) => void;
  onRaiseHistoryClick: (offer: Offer) => void;
};

const OfferDetailsTable = ({
  offers,
  filteredOffers,
  applicationsById,
  adjustedByOfferId,
  onEditClick,
  onToggleCurrent,
  onNegotiateClick,
  onRaiseHistoryClick,
}: Props) => {
  const currentOffer = offers.find((o) => o.is_current);
  const currentTotal = currentOffer
    ? Number(currentOffer.base_salary) +
      Number(currentOffer.bonus) +
      Number(currentOffer.equity) +
      Number(currentOffer.sign_on)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Offer Details</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company / Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RTO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Base Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bonus
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Equity / Yr
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sign-On
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Comp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Adjusted Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PTO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Holiday Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Diff vs Current
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Adj Diff vs Current
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOffers.map((offer, idx) => {
              const app = applicationsById[offer.application];
              const total =
                Number(offer.base_salary) +
                Number(offer.bonus) +
                Number(offer.equity) +
                Number(offer.sign_on);
              const isCurrent = offer.is_current;

              const diff = total - currentTotal;
              const diffPercent = currentTotal > 0 ? ((diff / currentTotal) * 100).toFixed(1) : 0;
              const adjusted = offer.id ? adjustedByOfferId[offer.id] : undefined;

              return (
                <tr key={offer.id || idx} className={isCurrent ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{app?.company_name || 'Unknown Company'}</span>
                        <span className="text-xs text-gray-500 font-normal">
                          {app?.role_title || 'Unknown Role'}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app?.location || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        app?.rto_policy === 'REMOTE'
                          ? 'bg-green-100 text-green-800'
                          : app?.rto_policy === 'ONSITE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800',
                      )}
                    >
                      {app?.rto_policy || 'Unknown'}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>${Number(offer.base_salary).toLocaleString()}</div>
                    <div className="text-xs text-gray-400">
                      After tax: ${Math.round(adjustedByOfferId[offer.id!]?.afterTaxBase || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>${Number(offer.bonus).toLocaleString()}</div>
                    <div className="text-xs text-gray-400">
                      After tax: ${Math.round(adjustedByOfferId[offer.id!]?.afterTaxBonus || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>${Number(offer.equity).toLocaleString()}</div>
                    <div className="text-xs text-gray-400">
                      After tax: ${Math.round(adjustedByOfferId[offer.id!]?.afterTaxEquity || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${Number(offer.sign_on).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    ${total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {adjusted ? `$${Math.round(adjusted.adjustedValue).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPtoLabel(offer.pto_days, !!offer.is_unlimited_pto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {offer.holiday_days ?? 11} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    {isCurrent ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className={diff >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {diff > 0 ? '+' : ''}${diff.toLocaleString()}
                        <span className="text-xs font-normal ml-1">
                          ({diff > 0 ? '+' : ''}
                          {diffPercent}%)
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    {isCurrent || !adjusted ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className={adjusted.adjustedDiff >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {adjusted.adjustedDiff >= 0 ? '+' : ''}$
                        {Math.round(adjusted.adjustedDiff).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-3">
                    <button
                      onClick={() => onEditClick(offer)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onToggleCurrent(offer)}
                      className={clsx(
                        'font-medium hover:underline',
                        isCurrent ? 'text-gray-500' : 'text-gray-400 hover:text-blue-600',
                      )}
                    >
                      {isCurrent ? 'Unmark' : 'Mark Current'}
                    </button>
                    {isCurrent && (
                      <button
                        onClick={() => onRaiseHistoryClick(offer)}
                        className="text-amber-600 hover:text-amber-800 font-medium"
                      >
                        Raise History
                      </button>
                    )}
                    {!isCurrent && (
                      <button
                        onClick={() => onNegotiateClick(offer)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Negotiate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {offers.length === 0 && (
              <tr>
                <td colSpan={14} className="px-6 py-4 text-center text-gray-500">
                  No offers available. Add an "OFFER" status to an application to see it here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OfferDetailsTable;
