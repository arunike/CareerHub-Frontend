import type { JDMatchResult } from '../api/career';

const STORAGE_KEY = 'jd_reports_v2';

export interface StoredReport extends JDMatchResult {
  id: string;
  savedAt: string;
  jdSnippet: string;
  title?: string;
  isLocked?: boolean;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStrictScoreLabel(score: number): JDMatchResult['score_label'] {
  if (score >= 90) return 'Strong match';
  if (score >= 70) return 'Good fit with minor gaps';
  if (score >= 50) return 'Partial match';
  return 'Poor match';
}

export function getAllReports(): StoredReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReport(report: JDMatchResult, jdText: string): StoredReport {
  const newReport: StoredReport = {
    ...report,
    score_label: getStrictScoreLabel(Number(report.score) || 0),
    id: generateId(),
    savedAt: new Date().toISOString(),
    jdSnippet: jdText.replace(/\s+/g, ' ').trim().slice(0, 180),
    isLocked: false,
  };
  const existing = getAllReports();
  
  const updated = [newReport, ...existing].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newReport;
}

export function toggleReportLock(id: string): void {
  const reports = getAllReports();
  const updated = reports.map((r) =>
    r.id === id ? { ...r, isLocked: !r.isLocked } : r
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getReportById(id: string): StoredReport | null {
  return getAllReports().find((r) => r.id === id) ?? null;
}

export function deleteReport(id: string): void {
  const reports = getAllReports();
  const report = reports.find((r) => r.id === id);
  if (report?.isLocked) return; // Prevent deletion if locked

  const updated = reports.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteAllReports(): void {
  const reports = getAllReports();
  const lockedReports = reports.filter((r) => r.isLocked);
  if (lockedReports.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lockedReports));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function updateReportTitle(id: string, title: string): void {
  const reports = getAllReports();
  const updated = reports.map((r) =>
    r.id === id ? { ...r, title } : r
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
