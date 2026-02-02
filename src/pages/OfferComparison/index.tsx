import React, { useState, useEffect } from 'react';
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
import { Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '../../context/ToastContext';

interface Offer {
  id?: number;
  application: number;
  base_salary: number;
  bonus: number;
  equity: number;
  sign_on: number;
  benefits_value: number;
  pto_days: number;
  is_current: boolean;
  created_at?: string;
}

interface Application {
  id: number;
  company_name: string;
  role_title: string;
  location?: string;
  rto_policy?: string;
}

const OfferComparison = () => {
  const { addToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [bonusMode, setBonusMode] = useState<'%' | '#'>('#');
  const [bonusPercent, setBonusPercent] = useState<number | string>('');

  const [equityMode, setEquityMode] = useState<'annual' | 'total'>('annual');
  const [vestingPercent, setVestingPercent] = useState<number>(25);
  const [tempTotalGrant, setTempTotalGrant] = useState<number | string>('');

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [newJobName, setNewJobName] = useState('Current Employer');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersResp, appsResp] = await Promise.all([getOffers(), getApplications()]);
      setOffers(offersResp.data);

      const formattedApps = appsResp.data.map((app: { company_details?: { name: string }; [key: string]: unknown }) => ({
        ...app,
        company_name: app.company_details?.name || '',
      }));
      setApplications(formattedApps);
    } catch (err) {
      console.error(err);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getApplicationName = (appId: number) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return `App #${appId}`;

    if (app.company_name && app.role_title) {
      return `${app.company_name} - ${app.role_title}`;
    }
    return app.company_name || app.role_title || `App #${appId}`;
  };

  const handleEditClick = (offer: Offer) => {
    const app = applications.find((a) => a.id === offer.application);
    setEditingApp(app ? { ...app } : null);
    setEditingOffer({ ...offer });

    // Reset Modes
    setBonusMode('#');
    setBonusPercent('');
    setEquityMode('annual');
    setVestingPercent(25);
    setTempTotalGrant('');
  };

  const handleSaveEdit = async () => {
    if (!editingOffer) return;

    try {
      // 1. Update Application if changed
      if (editingApp) {
        await updateApplication(editingApp.id, {
          company_name: editingApp.company_name,
          role_title: editingApp.role_title,
        });
      }

      // 2. Update Offer
      await updateOffer(editingOffer.id!, editingOffer);

      addToast('Offer updated successfully', 'success');
      setEditingOffer(null);
      setEditingApp(null);
      fetchData(); // Refresh to show new names/values
    } catch (err) {
      console.error(err);
      addToast('Failed to save changes', 'error');
    }
  };

  const toggleCurrent = async (offer: Offer) => {
    // If it's a pending offer (no ID), we should create it first (edge case), but usually current jobs are created.
    if (!offer.id) return;

    const updated = { ...offer, is_current: !offer.is_current };
    try {
      await updateOffer(offer.id, updated);
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated : o)));
    } catch (err) {
      console.error(err);
      addToast('Failed to update status', 'error');
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
        pto_days: 15,
      });

      fetchData();
      addToast('Current job added!', 'success');
      setIsAddJobOpen(false);
      setNewJobName('Current Employer');
    } catch (err) {
      console.error(err);
      addToast('Failed to add current job.', 'error');
    }
  };



  // Prepare Chart Data
  const chartData = offers.map((offer) => {
    const appName = getApplicationName(offer.application);
    const totalComp =
      Number(offer.base_salary) +
      Number(offer.bonus) +
      Number(offer.equity) +
      Number(offer.sign_on) +
      Number(offer.benefits_value);

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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading offers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Offer Comparison</h2>
          <p className="text-gray-500">Compare Total Compensation (TC) across your offers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddJobOpen(true)}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Current Job
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(val) => `$${val / 1000}k`} />
            <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="Base" stackId="a" fill="#6366f1" />
            <Bar dataKey="Bonus" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="Equity" stackId="a" fill="#ec4899" />
            <Bar dataKey="SignOn" stackId="a" fill="#14b8a6" />
            <Bar dataKey="Benefits" stackId="a" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
                  PTO Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff vs Current
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {offers.map((offer, idx) => {
                const app = applications.find((a) => a.id === offer.application);
                const total =
                  Number(offer.base_salary) +
                  Number(offer.bonus) +
                  Number(offer.equity) +
                  Number(offer.sign_on) +
                  Number(offer.benefits_value);
                const isCurrent = offer.is_current;

                // Find Current Offer Total for comparison
                const currentOffer = offers.find((o) => o.is_current);
                const currentTotal = currentOffer
                  ? Number(currentOffer.base_salary) +
                    Number(currentOffer.bonus) +
                    Number(currentOffer.equity) +
                    Number(currentOffer.sign_on) +
                    Number(currentOffer.benefits_value)
                  : 0;

                const diff = total - currentTotal;
                const diffPercent = currentTotal > 0 ? ((diff / currentTotal) * 100).toFixed(1) : 0;

                return (
                  <tr key={offer.id || idx} className={isCurrent ? 'bg-indigo-50' : ''}>
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
                          <span className="ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
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
                      ${Number(offer.base_salary).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${Number(offer.bonus).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${Number(offer.equity).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${Number(offer.sign_on).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ${total.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {offer.pto_days || 0} days
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

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-3">
                      <button
                        onClick={() => handleEditClick(offer)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleCurrent(offer)}
                        className={clsx(
                          'font-medium hover:underline',
                          isCurrent ? 'text-gray-500' : 'text-gray-400 hover:text-indigo-600'
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
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No offers available. Add an "OFFER" status to an application to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Job Modal */}
      {isAddJobOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Add Current Job</h3>
              <button
                onClick={() => setIsAddJobOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Add Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Offer Modal */}
      {editingOffer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Edit Offer Details</h3>
              <button
                onClick={() => setEditingOffer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* App Details Editing */}
              {editingApp && (
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                    <input
                      type="text"
                      value={editingApp.company_name}
                      onChange={(e) =>
                        setEditingApp({ ...editingApp, company_name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role Title</label>
                    <input
                      type="text"
                      value={editingApp.role_title}
                      onChange={(e) => setEditingApp({ ...editingApp, role_title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Salary</label>
                  <input
                    type="number"
                    value={editingOffer.base_salary}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        base_salary: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Bonus (Annual)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (bonusMode === '#') {
                            // Switching TO %
                            const base = Number(editingOffer.base_salary) || 0;
                            const bonus = Number(editingOffer.bonus) || 0;
                            const pct = base > 0 ? (bonus / base) * 100 : 0;
                            setBonusPercent(pct.toFixed(2).replace(/\.00$/, ''));
                            setBonusMode('%');
                          } else {
                            setBonusMode('#');
                          }
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Use {bonusMode === '#' ? '%' : '$'}
                      </button>
                    </div>
                    <div className="relative rounded-md shadow-sm">
                      {bonusMode === '#' ? (
                        <>
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            value={editingOffer.bonus}
                            onChange={(e) =>
                              setEditingOffer({
                                ...editingOffer,
                                bonus: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="block w-full rounded-md border-gray-300 pl-9 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="number"
                            placeholder="%"
                            value={bonusPercent}
                            onChange={(e) => {
                              setBonusPercent(e.target.value);
                              const pct = parseFloat(e.target.value) || 0;
                              const base = Number(editingOffer.base_salary) || 0;
                              const absVal = (pct / 100) * base;
                              setEditingOffer({ ...editingOffer, bonus: absVal });
                            }}
                            className="block w-full rounded-md border-gray-300 pl-3 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                          <p className="absolute top-full text-xs text-gray-500 mt-1">
                            ≈ ${Number(editingOffer.bonus).toLocaleString()}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">Equity</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // When switching to total, populate the total based on current annual / percent
                            if (equityMode !== 'total') {
                              const annual = Number(editingOffer.equity) || 0;
                              const pct = vestingPercent || 25;
                              const total = pct > 0 ? annual / (pct / 100) : 0;
                              setTempTotalGrant(total.toFixed(0)); // Keep it clean
                            }
                            setEquityMode('total');
                          }}
                          className={clsx(
                            'text-xs underline',
                            equityMode === 'total'
                              ? 'text-indigo-800 font-bold'
                              : 'text-gray-500 hover:text-indigo-600'
                          )}
                        >
                          Total
                        </button>
                        <span className="text-xs text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setEquityMode('annual')}
                          className={clsx(
                            'text-xs underline',
                            equityMode === 'annual'
                              ? 'text-indigo-800 font-bold'
                              : 'text-gray-500 hover:text-indigo-600'
                          )}
                        >
                          /Yr
                        </button>
                      </div>
                    </div>

                    {equityMode === 'annual' ? (
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          value={editingOffer.equity}
                          onChange={(e) =>
                            setEditingOffer({
                              ...editingOffer,
                              equity: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="block w-full rounded-md border-gray-300 pl-9 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                          placeholder="Annual Value"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative rounded-md shadow-sm flex-1">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            value={tempTotalGrant}
                            placeholder="Total Grant"
                            onChange={(e) => {
                              const totalVal = parseFloat(e.target.value) || 0;
                              setTempTotalGrant(e.target.value);
                              // Calc annual: Total * (Percent / 100)
                              const annual = totalVal * ((vestingPercent || 0) / 100);
                              setEditingOffer({ ...editingOffer, equity: annual });
                            }}
                            className="block w-full rounded-md border-gray-300 pl-9 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                          />
                        </div>
                        <div className="w-24 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            value={vestingPercent}
                            onChange={(e) => {
                              const pct = parseFloat(e.target.value) || 0;
                              setVestingPercent(pct);

                              const total = Number(tempTotalGrant) || 0;
                              const annual = total * (pct / 100);
                              setEditingOffer({ ...editingOffer, equity: annual });
                            }}
                            className="block w-full rounded-md border-gray-300 pr-6 text-center focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {equityMode === 'total' && (
                      <p className="text-xs text-gray-500 mt-1">
                        ≈ ${Number(editingOffer.equity).toLocaleString()} / yr
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sign-on Bonus</label>
                    <input
                      type="number"
                      value={editingOffer.sign_on}
                      onChange={(e) =>
                        setEditingOffer({
                          ...editingOffer,
                          sign_on: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Benefits Value
                    </label>
                    <input
                      type="number"
                      value={editingOffer.benefits_value}
                      onChange={(e) =>
                        setEditingOffer({
                          ...editingOffer,
                          benefits_value: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PTO Days</label>
                  <input
                    type="number"
                    value={editingOffer.pto_days}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, pto_days: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingOffer.is_current}
                      onChange={(e) =>
                        setEditingOffer({ ...editingOffer, is_current: e.target.checked })
                      }
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <span>Is Current Role?</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setEditingOffer(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
              >
                Save Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferComparison;
