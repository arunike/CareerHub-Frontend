import api from '../client';

export const getOffers = () => api.get('/career/offers/');

export const createOffer = (data: Record<string, unknown>) => api.post('/career/offers/', data);

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
