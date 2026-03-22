const STORAGE_KEY = 'cover_letters_v1';

export interface StoredCoverLetter {
  id: string;
  applicationId: number;
  companyName: string;
  roleTitle: string;
  coverLetter: string;
  jdSnippet: string;
  title?: string;
  isLocked: boolean;
  savedAt: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getAllCoverLetters(): StoredCoverLetter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCoverLetter(
  applicationId: number,
  companyName: string,
  roleTitle: string,
  coverLetter: string,
  jdText: string,
): StoredCoverLetter {
  const entry: StoredCoverLetter = {
    id: generateId(),
    applicationId,
    companyName,
    roleTitle,
    coverLetter,
    jdSnippet: jdText.replace(/\s+/g, ' ').trim().slice(0, 160),
    isLocked: false,
    savedAt: new Date().toISOString(),
  };
  const existing = getAllCoverLetters();
  const updated = [entry, ...existing].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return entry;
}

export function updateCoverLetterTitle(id: string, title: string): void {
  const letters = getAllCoverLetters();
  const updated = letters.map((l) => (l.id === id ? { ...l, title } : l));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function toggleCoverLetterLock(id: string): void {
  const letters = getAllCoverLetters();
  const updated = letters.map((l) => (l.id === id ? { ...l, isLocked: !l.isLocked } : l));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteCoverLetter(id: string): void {
  const letters = getAllCoverLetters();
  const letter = letters.find((l) => l.id === id);
  if (letter?.isLocked) return;
  const updated = letters.filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteAllCoverLetters(): void {
  const letters = getAllCoverLetters();
  const locked = letters.filter((l) => l.isLocked);
  if (locked.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locked));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
