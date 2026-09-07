import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { getApplications, getOffers, getStockPrices } from '../../api';
import { getAvailableYears, filterByYear } from '../../utils/yearFilter';
import { loadUsCityOptions } from '../../lib/usCityOptions';
import {
  type ApplicationLike as Application,
  type OfferLike as Offer,
  type OfferStatusFilter,
  isPastRole,
} from './calculations';
import { isOfferRejected } from './useOfferMutations';
import { isUnfilledOffer, withCurrentPay } from './currentPay';
import { pricesBySymbol, withCurrentEquity } from './equityPricing';
import type { PriceBySymbol } from './equityPricing';

export const useOfferPageData = ({
  messageApi,
  selectedYear,
  statusFilter,
}: {
  messageApi: MessageInstance;
  selectedYear: number | 'all';
  statusFilter: OfferStatusFilter;
}) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsCityOptions, setAllUsCityOptions] = useState<string[]>([]);
  const [stockPrices, setStockPrices] = useState<PriceBySymbol>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const offersResp = await getOffers();
      const offersData = offersResp.data || [];
      setOffers(offersData);

      // A missing price list must not blank the page; every offer just keeps its stored value.
      const priceResp = await getStockPrices().catch(() => null);
      setStockPrices(pricesBySymbol(priceResp?.data ?? []));

      const linkedAppIds = Array.from(
        new Set(offersData.map((offer: Offer) => offer.application).filter(Boolean))
      ) as number[];

      const appsResp =
        linkedAppIds.length > 0
          ? await getApplications({ ids: linkedAppIds.join(',') })
          : { data: [] };

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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    loadUsCityOptions()
      .then(setAllUsCityOptions)
      .catch((error) => {
        console.error('Failed to load US city options', error);
      });
  }, []);

  useEffect(() => {
    if (!loadError) return;
    messageApi.error(loadError);
    setLoadError(null);
  }, [loadError, messageApi]);

  const getApplicationName = (appId: number) => {
    const app = applications.find((candidate) => candidate.id === appId);
    if (!app) return `App #${appId}`;
    if (app.company_name && app.role_title) {
      return `${app.company_name} - ${app.role_title}`;
    }
    return app.company_name || app.role_title || `App #${appId}`;
  };

  const currentJobName = useMemo(() => {
    const current = offers.find((offer) => offer.is_current);
    if (!current) return null;
    return getApplicationName(current.application);
    // getApplicationName only reads `applications`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, offers]);

  const applicationsById = useMemo(
    () =>
      applications.reduce<Record<number, Application>>((acc, app) => {
        acc[app.id] = app;
        return acc;
      }, {}),
    [applications]
  );

  const offerYearDate = useCallback(
    (offer: Offer) => applicationsById[offer.application]?.date_applied || offer.created_at,
    [applicationsById]
  );

  // Raw `offers` is what you edit; this restates it at today's pay, then at today's share price.
  const comparisonOffers = useMemo(
    () => offers.map((offer) => withCurrentEquity(withCurrentPay(offer), stockPrices)),
    [offers, stockPrices]
  );

  const availableYears = useMemo(
    () => getAvailableYears(comparisonOffers, offerYearDate),
    [comparisonOffers, offerYearDate]
  );

  const filteredByYear = useMemo(
    () => filterByYear(comparisonOffers, selectedYear, offerYearDate),
    [comparisonOffers, selectedYear, offerYearDate]
  );

  const rejectedOffersCount = useMemo(
    () =>
      offers.filter((offer) => isOfferRejected(offer, applicationsById[offer.application])).length,
    [offers, applicationsById]
  );

  // An offer that was declined was never a role held, so rejected wins over past.
  const pastOffersCount = useMemo(
    () =>
      offers.filter(
        (offer) => !isOfferRejected(offer, applicationsById[offer.application]) && isPastRole(offer)
      ).length,
    [offers, applicationsById]
  );

  // Kept out of the comparison but not hidden from the user; the page names them instead.
  const unfilledOffers = useMemo(
    () => comparisonOffers.filter(isUnfilledOffer),
    [comparisonOffers]
  );

  const filteredOffers = useMemo(
    () =>
      filteredByYear.filter((offer) => {
        if (isUnfilledOffer(offer)) return false;
        const app = applicationsById[offer.application];
        const rejected = isOfferRejected(offer, app);
        const past = !rejected && isPastRole(offer);
        if (statusFilter === 'rejected') return rejected;
        if (statusFilter === 'past') return past;
        if (statusFilter === 'active') return !rejected && !past;
        return true;
      }),
    [filteredByYear, applicationsById, statusFilter]
  );

  const handleAddLoadedApplication = useCallback((app: Application) => {
    setApplications((prev) => {
      if (prev.some((candidate) => candidate.id === app.id)) return prev;
      return [...prev, app];
    });
  }, []);

  const refreshStockPrices = useCallback(async () => {
    const resp = await getStockPrices().catch(() => null);
    setStockPrices(pricesBySymbol(resp?.data ?? []));
  }, []);

  return {
    offers,
    comparisonOffers,
    unfilledOffers,
    stockPrices,
    refreshStockPrices,
    setOffers,
    applications,
    setApplications,
    loading,
    allUsCityOptions,
    fetchData,
    getApplicationName,
    currentJobName,
    applicationsById,
    availableYears,
    filteredByYear,
    rejectedOffersCount,
    pastOffersCount,
    filteredOffers,
    handleAddLoadedApplication,
  };
};
