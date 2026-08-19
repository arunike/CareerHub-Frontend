import { downloadDocument } from '../api/career';

// The stored `file` is a storage key on an authed endpoint, so an anchor cannot open it.
export const openDocumentInNewTab = async (documentId: number) => {
  const response = await downloadDocument(documentId);
  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const objectUrl = URL.createObjectURL(new Blob([response.data], { type: contentType }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
  // Revoked late so the new tab has finished reading it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};
