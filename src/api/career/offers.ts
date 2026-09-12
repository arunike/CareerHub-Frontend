import api from '../client';

export const getOffers = () => api.get('/career/offers/');

export const exportOffers = (format: string) =>
  api.get(`/career/offers/export/?fmt=${format}`, { responseType: 'blob' });

export const updateOffer = (id: number, data: Record<string, unknown>) =>
  api.patch(`/career/offers/${id}/`, data);

export const deleteOffer = (id: number) => api.delete(`/career/offers/${id}/`);

export interface OfferDecisionSnapshot {
  id: number;
  offer: number;
  company_name: string;
  role_title: string;
  title: string;
  notes: string;
  decision_score: number | null;
  rank: number | null;
  total_comp: string;
  adjusted_value: string | null;
  monthly_rent: string | null;
  commute_cost_annual: string | null;
  tax_snapshot: Record<string, unknown>;
  score_categories: Array<Record<string, unknown>>;
  offer_snapshot: Record<string, unknown>;
  adjustment_snapshot: Record<string, unknown>;
  is_locked: boolean;
  captured_at: string;
  updated_at: string;
}

export type OfferDecisionSnapshotPayload = Omit<
  OfferDecisionSnapshot,
  'id' | 'company_name' | 'role_title' | 'captured_at' | 'updated_at'
>;

export const getOfferDecisionSnapshots = (offerId?: number) =>
  api.get<OfferDecisionSnapshot[]>('/career/offer-decision-snapshots/', {
    params: { offer: offerId },
  });

export const createOfferDecisionSnapshot = (data: Partial<OfferDecisionSnapshotPayload>) =>
  api.post<OfferDecisionSnapshot>('/career/offer-decision-snapshots/', data);

export const updateOfferDecisionSnapshot = (
  id: number,
  data: Partial<OfferDecisionSnapshotPayload>
) => api.patch<OfferDecisionSnapshot>(`/career/offer-decision-snapshots/${id}/`, data);

export const deleteOfferDecisionSnapshot = (id: number) =>
  api.delete(`/career/offer-decision-snapshots/${id}/`);

export interface NegotiationAdvice {
  talking_points: string[];
  leverage_points: string[];
  caution_points: string[];
  suggested_ask: {
    base_salary: number | null;
    sign_on: number | null;
    equity: number | null;
    pto_days: number | null;
    notes: string;
  };
}

export interface StockPrice {
  id: number;
  symbol: string;
  price: string;
  as_of: string;
  source: 'MANUAL' | 'API';
  note: string;
  updated_at: string;
}

export const getStockPrices = () => api.get<StockPrice[]>('/career/stock-prices/');

// POST upserts on the server, so re-entering a ticker updates it rather than failing.
export const saveStockPrice = (data: {
  symbol: string;
  price: number;
  as_of: string;
  note?: string;
}) => api.post<StockPrice>('/career/stock-prices/', data);

export interface OfferDecisionJournalPayload {
  offer: number;
  decision: 'ACCEPTED' | 'DECLINED';
  decided_on: string;
  started_on?: string | null;
  reasons?: string;
  concerns?: Array<{ id: string; text: string; outcome?: string | null }>;
  criteria?: string[];
  reviews?: Array<{
    milestone: number;
    completed_on?: string | null;
    verdict?: string | null;
    notes?: string;
    criteria_verdicts?: Record<string, string | null | undefined>;
  }>;
}

export const getOfferDecisionJournal = () => api.get('/career/offer-decision-journal/');

export const createOfferDecisionJournal = (data: OfferDecisionJournalPayload) =>
  api.post('/career/offer-decision-journal/', data);

export const updateOfferDecisionJournal = (
  id: number,
  data: Partial<OfferDecisionJournalPayload>
) => api.patch(`/career/offer-decision-journal/${id}/`, data);

export interface StockPriceHistoryRow {
  id: number;
  symbol: string;
  price: string;
  as_of: string;
  source: string;
  note: string;
  recorded_at: string;
}

// Live prices: one ticker when named, otherwise every ticker already tracked.
export const refreshStockPrice = (symbol?: string) =>
  api.post<{ updated: StockPrice[]; failed: Array<{ symbol: string; detail: string }> }>(
    '/career/stock-prices/refresh/',
    symbol ? { symbol } : {}
  );

export const getStockPriceHistory = (symbol?: string) =>
  api.get<StockPriceHistoryRow[]>('/career/stock-prices/history/', {
    params: symbol ? { symbol } : undefined,
  });

export const deleteOfferDecisionJournal = (id: number) =>
  api.delete(`/career/offer-decision-journal/${id}/`);
