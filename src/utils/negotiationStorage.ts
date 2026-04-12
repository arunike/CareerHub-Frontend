import type { NegotiationAdvice } from '../api/career';

const STORAGE_KEY = 'negotiation_results_v1';

export interface StoredNegotiationResult {
  id: string;
  offerId: number;
  companyName: string;
  roleTitle: string;
  offerSnapshot: {
    base_salary: number;
    bonus: number;
    equity: number;
    sign_on: number;
    pto_days: number;
    is_unlimited_pto?: boolean;
  };
  advice: NegotiationAdvice;
  title?: string;
  isLocked: boolean;
  savedAt: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getAllNegotiationResults(): StoredNegotiationResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNegotiationResult(
  offerId: number,
  companyName: string,
  roleTitle: string,
  offerSnapshot: StoredNegotiationResult['offerSnapshot'],
  advice: NegotiationAdvice,
): StoredNegotiationResult {
  const entry: StoredNegotiationResult = {
    id: generateId(),
    offerId,
    companyName,
    roleTitle,
    offerSnapshot,
    advice,
    isLocked: false,
    savedAt: new Date().toISOString(),
  };
  const existing = getAllNegotiationResults();
  const updated = [entry, ...existing].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return entry;
}

export function getNegotiationResultById(id: string): StoredNegotiationResult | null {
  return getAllNegotiationResults().find((r) => r.id === id) ?? null;
}

export function updateNegotiationResultTitle(id: string, title: string): void {
  const results = getAllNegotiationResults();
  const updated = results.map((r) => (r.id === id ? { ...r, title } : r));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function toggleNegotiationResultLock(id: string): void {
  const results = getAllNegotiationResults();
  const updated = results.map((r) => (r.id === id ? { ...r, isLocked: !r.isLocked } : r));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteNegotiationResult(id: string): void {
  const results = getAllNegotiationResults();
  const result = results.find((r) => r.id === id);
  if (result?.isLocked) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results.filter((r) => r.id !== id)));
}

export function deleteAllNegotiationResults(): void {
  const results = getAllNegotiationResults();
  const locked = results.filter((r) => r.isLocked);
  if (locked.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locked));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
