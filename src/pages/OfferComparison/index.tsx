import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOffers,
  createOffer,
  updateOffer,
  getApplications,
  createApplication,
  updateApplication,
} from '../../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import PageActionToolbar from '../../components/PageActionToolbar';
import { getAvailableYears, filterByYear, getCurrentYear } from '../../utils/yearFilter';
import { message } from 'antd';
import { createPortal } from 'react-dom';
import { usaCities } from 'typed-usa-states';
import OfferAdjustmentsPanel from './OfferAdjustmentsPanel';
import OfferFormFields from './OfferFormFields';
import { useSafeNullableFormState } from './useSafeFormState';
import {
  type ApplicationLike as Application,
  type BenefitItem,
  DEFAULT_STATE_NAME_TO_ABBR,
  type OfferLike as Offer,
  computeBenefitsTotal,
} from './calculations';

const normalizeBenefitItem = (item: Partial<BenefitItem>, fallbackId: string): BenefitItem => ({
  id: item.id || fallbackId,
  label: item.label || '',
  amount: Number(item.amount) || 0,
  frequency: item.frequency === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
});

const OfferComparison = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    state: editingOffer,
    setState: setEditingOffer,
    patch: patchEditingOffer,
    setField: setEditingOfferField,
  } = useSafeNullableFormState<Offer>(null);
  const {
    state: editingApp,
    setState: setEditingApp,
    patch: patchEditingApp,
  } = useSafeNullableFormState<Application>(null);
  const [editingBenefitItems, setEditingBenefitItems] = useState<BenefitItem[]>([]);
  const [offerModalMode, setOfferModalMode] = useState<'view' | 'edit'>('edit');

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [newJobName, setNewJobName] = useState('Current Employer');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [adjustedByOfferId, setAdjustedByOfferId] = useState<
    Record<
      number,
      {
        adjustedValue: number;
        adjustedDiff: number;
        afterTaxBase: number;
        afterTaxBonus: number;
        afterTaxEquity: number;
        usedBaseTaxRate: number;
        usedBonusTaxRate: number;
        usedEquityTaxRate: number;
        monthlyRent: number;
      }
    >
  >({});
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('offersSelectedYear');
    return saved ? (saved === 'all' ? 'all' : parseInt(saved)) : getCurrentYear();
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const allUsCityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          usaCities.map((city) => {
            const abbr = DEFAULT_STATE_NAME_TO_ABBR[city.state] || city.state;
            return `${city.name}, ${abbr}, United States`;
          })
        )
      ),
    []
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersResp, appsResp] = await Promise.all([getOffers(), getApplications()]);
      setOffers(offersResp.data);

      const formattedApps = appsResp.data.map(
        (app: { company_details?: { name: string }; [key: string]: unknown }) => ({
          ...app,
          company_name: app.company_details?.name || '',
        })
      );
      setApplications(formattedApps);
    } catch (error) {
      setLoadError('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadError) return;
    messageApi.error(loadError);
    setLoadError(null);
  }, [loadError, messageApi]);

  const getApplicationName = (appId: number) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return `App #${appId}`;

    if (app.company_name && app.role_title) {
      return `${app.company_name} - ${app.role_title}`;
    }
    return app.company_name || app.role_title || `App #${appId}`;
  };

  const openOfferModal = (offer: Offer, mode: 'view' | 'edit') => {
    setOfferModalMode(mode);
    const app = applications.find((a) => a.id === offer.application);
    setEditingApp(
      app
        ? {
            ...app,
            rto_days_per_week:
              typeof app.rto_days_per_week === 'number'
                ? app.rto_days_per_week
                : app.rto_policy === 'REMOTE'
                  ? 0
                  : app.rto_policy === 'ONSITE'
                    ? 5
                    : 3,
            commute_cost_value: Number(app.commute_cost_value || 0),
            commute_cost_frequency: (app.commute_cost_frequency || 'MONTHLY') as 'DAILY' | 'MONTHLY' | 'YEARLY',
            free_food_perk_value: Number(app.free_food_perk_value || 0),
            free_food_perk_frequency: (app.free_food_perk_frequency || 'YEARLY') as 'DAILY' | 'MONTHLY' | 'YEARLY',
            tax_base_rate: app.tax_base_rate != null ? Number(app.tax_base_rate) : undefined,
            tax_bonus_rate: app.tax_bonus_rate != null ? Number(app.tax_bonus_rate) : undefined,
            tax_equity_rate: app.tax_equity_rate != null ? Number(app.tax_equity_rate) : undefined,
            monthly_rent_override:
              app.monthly_rent_override != null ? Number(app.monthly_rent_override) : undefined,
          }
        : null
    );
    setEditingOffer({ ...offer });
    const benefitItems =
      Array.isArray(offer.benefit_items) && offer.benefit_items.length > 0
        ? offer.benefit_items.map((item, idx) =>
            normalizeBenefitItem(item, `edit-benefit-${offer.id || Date.now()}-${idx}`)
          )
        : [
            {
              id: `edit-benefit-${Date.now()}`,
              label: 'Benefits',
              amount: Number(offer.benefits_value) || 0,
              frequency: 'YEARLY' as const,
            },
          ];
    setEditingBenefitItems(benefitItems);
  };

  const handleEditClick = (offer: Offer) => {
    openOfferModal(offer, 'edit');
  };

  const handleViewFromAdjusted = (offerId: number) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;
    openOfferModal(offer, 'view');
  };

  const handleEditFromAdjusted = (offerId: number) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;
    openOfferModal(offer, 'edit');
  };

  const handleSaveEdit = async () => {
    if (!editingOffer) return;

    try {
      // 1. Update Application if changed
      if (editingApp) {
        await updateApplication(editingApp.id, {
          company_name: editingApp.company_name,
          role_title: editingApp.role_title,
          location: editingApp.location,
          rto_policy: editingApp.rto_policy,
          rto_days_per_week: editingApp.rto_days_per_week ?? 0,
          commute_cost_value: editingApp.commute_cost_value ?? 0,
          commute_cost_frequency: editingApp.commute_cost_frequency ?? 'MONTHLY',
          free_food_perk_value: editingApp.free_food_perk_value ?? 0,
          free_food_perk_frequency: editingApp.free_food_perk_frequency ?? 'YEARLY',
          tax_base_rate: editingApp.tax_base_rate ?? null,
          tax_bonus_rate: editingApp.tax_bonus_rate ?? null,
          tax_equity_rate: editingApp.tax_equity_rate ?? null,
          monthly_rent_override: editingApp.monthly_rent_override ?? null,
        });
      }

      // 2. Update Offer
      await updateOffer(editingOffer.id!, {
        ...editingOffer,
        benefit_items: editingBenefitItems,
        benefits_value: computeBenefitsTotal(editingBenefitItems),
      });

      messageApi.success('Offer updated successfully');
      setEditingOffer(null);
      setEditingApp(null);
      setOfferModalMode('edit');
      fetchData(); // Refresh to show new names/values
    } catch (error) {
      messageApi.error('Failed to save changes');
      console.error(error);
    }
  };

  const toggleCurrent = async (offer: Offer) => {
    // If it's a pending offer (no ID), we should create it first (edge case), but usually current jobs are created.
    if (!offer.id) return;

    const updated = { ...offer, is_current: !offer.is_current };
    try {
      await updateOffer(offer.id, updated);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated : o)));
    } catch (error) {
      messageApi.error('Failed to update status');
      console.error(error);
    }
  };

  const handleAddCurrentJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName) return;

    try {
      const appResp = await createApplication({
        company_name: newJobName,
        role_title: 'Current Role',
        status: 'ACCEPTED',
        date_applied: new Date().toISOString().split('T')[0],
      });
      const appId = appResp.data.id;

      await createOffer({
        application: appId,
        base_salary: 0,
        is_current: true,
        bonus: 0,
        equity: 0,
        sign_on: 0,
        benefits_value: 0,
        benefit_items: [],
        pto_days: 15,
        holiday_days: 11,
      });

      fetchData();
      fetchData();
      messageApi.success('Current job added!');
      setIsAddJobOpen(false);
      setNewJobName('Current Employer');
    } catch (error) {
      messageApi.error('Failed to add current job');
      console.error(error);
    }
  };

  // Filter offers by year
  const filteredOffers = filterByYear(offers, selectedYear, 'created_at');
  const availableYears = getAvailableYears(offers, 'created_at');
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
    localStorage.setItem('offersSelectedYear', year.toString());
  };

  // Prepare Chart Data
  const chartData = filteredOffers.map((offer) => {
    const appName = getApplicationName(offer.application);
    const totalComp =
      Number(offer.base_salary) +
      Number(offer.bonus) +
      Number(offer.equity) +
      Number(offer.sign_on);

    return {
      name: appName,
      Base: Number(offer.base_salary),
      Bonus: Number(offer.bonus),
      Equity: Number(offer.equity),
      SignOn: Number(offer.sign_on),
      Benefits: Number(offer.benefits_value),
      Total: totalComp,
    };
  });

  const updateEditingBenefits = (items: BenefitItem[]) => {
    setEditingBenefitItems(items);
    const total = computeBenefitsTotal(items);
    patchEditingOffer({
      benefits_value: total,
      benefit_items: items,
    });
  };

  const addEditingBenefitItem = () => {
    updateEditingBenefits([
      ...editingBenefitItems,
      { id: `edit-benefit-${Date.now()}`, label: '', amount: 0, frequency: 'MONTHLY' },
    ]);
  };

  const updateEditingBenefitItem = (id: string, patch: Partial<BenefitItem>) => {
    updateEditingBenefits(editingBenefitItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeEditingBenefitItem = (id: string) => {
    updateEditingBenefits(editingBenefitItems.filter((item) => item.id !== id));
  };

  const handleRealAdjustedChange = useCallback(
    (
      next: Record<
        number,
        {
          adjustedValue: number;
          adjustedDiff: number;
          afterTaxBase: number;
          afterTaxBonus: number;
          afterTaxEquity: number;
          usedBaseTaxRate: number;
          usedBonusTaxRate: number;
          usedEquityTaxRate: number;
          monthlyRent: number;
        }
      >
    ) => {
      setAdjustedByOfferId((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) return next;
        for (const key of nextKeys) {
          const prevRow = prev[Number(key)];
          const nextRow = next[Number(key)];
          if (!prevRow || !nextRow) return next;
          if (
            Math.round(prevRow.adjustedValue) !== Math.round(nextRow.adjustedValue) ||
            Math.round(prevRow.adjustedDiff) !== Math.round(nextRow.adjustedDiff) ||
            Math.round(prevRow.afterTaxBase) !== Math.round(nextRow.afterTaxBase) ||
            Math.round(prevRow.afterTaxBonus) !== Math.round(nextRow.afterTaxBonus) ||
            Math.round(prevRow.afterTaxEquity) !== Math.round(nextRow.afterTaxEquity) ||
            Math.round(prevRow.usedBaseTaxRate) !== Math.round(nextRow.usedBaseTaxRate) ||
            Math.round(prevRow.usedBonusTaxRate) !== Math.round(nextRow.usedBonusTaxRate) ||
            Math.round(prevRow.usedEquityTaxRate) !== Math.round(nextRow.usedEquityTaxRate) ||
            Math.round(prevRow.monthlyRent) !== Math.round(nextRow.monthlyRent)
          ) {
            return next;
          }
        }
        return prev;
      });
    },
    []
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading offers...</div>;

  return (
    <div className="space-y-6">
      {contextHolder}
      <PageActionToolbar
        title="Offer Comparison"
        subtitle="Compare Total Compensation (TC) across your offers."
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        availableYears={availableYears}
        onPrimaryAction={() => setIsAddJobOpen(true)}
        primaryActionLabel="Add Current Job"
        primaryActionIcon={<PlusOutlined />}
        extraActions={
          <button
            onClick={() => setIsSimulatorOpen((prev) => !prev)}
            className="toolbar-native-btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm shadow-sm"
          >
            {isSimulatorOpen ? 'Hide Offer Adjustments' : 'Open Offer Adjustments'}
          </button>
        }
      />

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(val) => `$${val / 1000}k`} />
            <Tooltip formatter={(val: number | undefined) => `$${(val || 0).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="Base" stackId="a" fill="#1890ff" />
            <Bar dataKey="Bonus" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="Equity" stackId="a" fill="#ec4899" />
            <Bar dataKey="SignOn" stackId="a" fill="#14b8a6" />
            <Bar dataKey="Benefits" stackId="a" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <OfferAdjustmentsPanel
        isOpen={isSimulatorOpen}
        filteredOffers={filteredOffers}
        applications={applications}
        getApplicationName={getApplicationName}
        onViewRealOffer={handleViewFromAdjusted}
        onEditRealOffer={handleEditFromAdjusted}
        onRealAdjustedChange={handleRealAdjustedChange}
      />

      {/* Comparison Table */}
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
                  PTO Days
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
                const app = applications.find((a) => a.id === offer.application);
                const total =
                  Number(offer.base_salary) +
                  Number(offer.bonus) +
                  Number(offer.equity) +
                  Number(offer.sign_on);
                const isCurrent = offer.is_current;

                // Find Current Offer Total for comparison
                const currentOffer = offers.find((o) => o.is_current);
                const currentTotal = currentOffer
                  ? Number(currentOffer.base_salary) +
                    Number(currentOffer.bonus) +
                    Number(currentOffer.equity) +
                    Number(currentOffer.sign_on)
                  : 0;

                const diff = total - currentTotal;
                const diffPercent = currentTotal > 0 ? ((diff / currentTotal) * 100).toFixed(1) : 0;
                const adjusted = offer.id ? adjustedByOfferId[offer.id] : undefined;

                return (
                  <tr key={offer.id || idx} className={isCurrent ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">
                            {app?.company_name || 'Unknown Company'}
                          </span>
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

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app?.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          app?.rto_policy === 'REMOTE'
                            ? 'bg-green-100 text-green-800'
                            : app?.rto_policy === 'ONSITE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        )}
                      >
                        {app?.rto_policy || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>${Number(offer.base_salary).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">
                        After tax: $
                        {Math.round(adjustedByOfferId[offer.id!]?.afterTaxBase || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>${Number(offer.bonus).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">
                        After tax: $
                        {Math.round(adjustedByOfferId[offer.id!]?.afterTaxBonus || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>${Number(offer.equity).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">
                        After tax: $
                        {Math.round(adjustedByOfferId[offer.id!]?.afterTaxEquity || 0).toLocaleString()}
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
                      {offer.pto_days || 0} days
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
                        onClick={() => handleEditClick(offer)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleCurrent(offer)}
                        className={clsx(
                          'font-medium hover:underline',
                          isCurrent ? 'text-gray-500' : 'text-gray-400 hover:text-blue-600'
                        )}
                      >
                        {isCurrent ? 'Unmark' : 'Mark Current'}
                      </button>
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

      {/* Add Job Modal */}
      {isAddJobOpen &&
        typeof document !== 'undefined' &&
        createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Add Current Job</h3>
              <button
                onClick={() => setIsAddJobOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseOutlined className="text-lg" />
              </button>
            </div>
            <form onSubmit={handleAddCurrentJob}>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="e.g. Current Employer"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddJobOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add Job
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Offer Modal */}
      {editingOffer &&
        typeof document !== 'undefined' &&
        createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                {offerModalMode === 'view' ? 'View Offer Details' : 'Edit Offer Details'}
              </h3>
              <button
                onClick={() => {
                  setEditingOffer(null);
                  setOfferModalMode('edit');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseOutlined className="text-lg" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <fieldset disabled={offerModalMode === 'view'} className="m-0 min-w-0 border-0 p-0">
                <OfferFormFields
                companyName={editingApp?.company_name || ''}
                onCompanyNameChange={(value) =>
                  patchEditingApp({ company_name: value })
                }
                roleTitle={editingApp?.role_title || ''}
                onRoleTitleChange={(value) =>
                  patchEditingApp({ role_title: value })
                }
                location={editingApp?.location || ''}
                onLocationChange={(value) =>
                  patchEditingApp({ location: value })
                }
                locationOptions={allUsCityOptions}
                taxRatePreview={
                  editingApp
                    ? {
                        baseTaxRate: Number(
                          editingApp.tax_base_rate ??
                            (editingOffer?.id ? adjustedByOfferId[editingOffer.id]?.usedBaseTaxRate : 32) ??
                            32
                        ),
                        bonusTaxRate: Number(
                          editingApp.tax_bonus_rate ??
                            (editingOffer?.id ? adjustedByOfferId[editingOffer.id]?.usedBonusTaxRate : 40) ??
                            40
                        ),
                        equityTaxRate: Number(
                          editingApp.tax_equity_rate ??
                            (editingOffer?.id ? adjustedByOfferId[editingOffer.id]?.usedEquityTaxRate : 42) ??
                            42
                        ),
                        note: 'Per-offer manual',
                      }
                    : undefined
                }
                editableTaxRates={{
                  baseTaxRate: Number(
                    editingApp?.tax_base_rate ??
                      (editingOffer?.id ? adjustedByOfferId[editingOffer.id]?.usedBaseTaxRate : 32) ??
                      32
                  ),
                  bonusTaxRate: Number(
                    editingApp?.tax_bonus_rate ??
                      (editingOffer?.id ? adjustedByOfferId[editingOffer.id]?.usedBonusTaxRate : 40) ??
                      40
                  ),
                  equityTaxRate: Number(
                    editingApp?.tax_equity_rate ??
                      (editingOffer?.id ? adjustedByOfferId[editingOffer.id]?.usedEquityTaxRate : 42) ??
                      42
                  ),
                }}
                onEditableTaxRatesChange={(next) =>
                  patchEditingApp({
                    tax_base_rate: next.baseTaxRate,
                    tax_bonus_rate: next.bonusTaxRate,
                    tax_equity_rate: next.equityTaxRate,
                  })
                }
                editableMonthlyRent={Number(
                  editingApp?.monthly_rent_override ??
                    (editingOffer?.id ? adjustedByOfferId[editingOffer.id]?.monthlyRent : 0) ??
                    0
                )}
                onEditableMonthlyRentChange={(value) =>
                  patchEditingApp({ monthly_rent_override: value })
                }
                baseSalary={Number(editingOffer.base_salary) || 0}
                onBaseSalaryChange={(value) => setEditingOfferField('base_salary', value)}
                bonus={Number(editingOffer.bonus) || 0}
                onBonusChange={(value) => setEditingOfferField('bonus', value)}
                equity={Number(editingOffer.equity) || 0}
                onEquityChange={(value) => setEditingOfferField('equity', value)}
                equityTotalGrant={Number(editingOffer.equity_total_grant ?? 0)}
                onEquityTotalGrantChange={(value) => setEditingOfferField('equity_total_grant', value)}
                equityVestingPercent={Number(editingOffer.equity_vesting_percent ?? 25)}
                onEquityVestingPercentChange={(value) => setEditingOfferField('equity_vesting_percent', value)}
                defaultEquityMode={Number(editingOffer.equity_total_grant ?? 0) > 0 ? 'total' : 'annual'}
                signOn={Number(editingOffer.sign_on) || 0}
                onSignOnChange={(value) => setEditingOfferField('sign_on', value)}
                benefitsValue={Number(editingOffer.benefits_value) || 0}
                benefitItems={editingBenefitItems}
                onAddBenefitItem={addEditingBenefitItem}
                onUpdateBenefitItem={updateEditingBenefitItem}
                onRemoveBenefitItem={removeEditingBenefitItem}
                computeBenefitsTotal={computeBenefitsTotal}
                workMode={
                  editingApp?.rto_policy === 'REMOTE'
                    ? 'REMOTE'
                    : editingApp?.rto_policy === 'ONSITE'
                      ? 'ONSITE'
                      : 'HYBRID'
                }
                onWorkModeChange={(value) =>
                  patchEditingApp((prev) => ({
                    rto_policy: value,
                    rto_days_per_week:
                      value === 'REMOTE' ? 0 : value === 'ONSITE' ? 5 : prev.rto_days_per_week ?? 3,
                  }))
                }
                rtoDaysPerWeek={Number(editingApp?.rto_days_per_week) || 0}
                onRtoDaysPerWeekChange={(value) =>
                  patchEditingApp({ rto_days_per_week: value })
                }
                commuteCostValue={Number(editingApp?.commute_cost_value) || 0}
                commuteCostFrequency={(editingApp?.commute_cost_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'MONTHLY'}
                onCommuteCostValueChange={(value) =>
                  patchEditingApp({ commute_cost_value: value })
                }
                onCommuteCostFrequencyChange={(value) =>
                  patchEditingApp({ commute_cost_frequency: value })
                }
                freeFoodPerkValue={Number(editingApp?.free_food_perk_value) || 0}
                freeFoodPerkFrequency={(editingApp?.free_food_perk_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'YEARLY'}
                onFreeFoodPerkValueChange={(value) =>
                  patchEditingApp({ free_food_perk_value: value })
                }
                onFreeFoodPerkFrequencyChange={(value) =>
                  patchEditingApp({ free_food_perk_frequency: value })
                }
                showCommuteAndPerks
                enableCompModeToggles
                ptoDays={Number(editingOffer.pto_days) || 0}
                onPtoDaysChange={(value) => setEditingOfferField('pto_days', value)}
                holidayDays={Number(editingOffer.holiday_days ?? 11)}
                onHolidayDaysChange={(value) => setEditingOfferField('holiday_days', value)}
                  locationPlaceholder="e.g. San Jose, CA"
                />
              </fieldset>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingOffer(null);
                  setOfferModalMode('edit');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {offerModalMode === 'view' ? 'Close' : 'Cancel'}
              </button>
              {offerModalMode === 'edit' && (
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Offer
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default OfferComparison;
