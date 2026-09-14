import { useEffect, useState } from 'react';
import { Spin, message } from 'antd';
import { FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { getDocuments } from '../../api/career';
import UploadDocumentModal from '../Documents/UploadDocumentModal';
import type { Document } from '../../types';
import { openDocumentInNewTab } from '../../utils/openDocument';

const TYPE_LABELS: Record<string, string> = {
  RESUME: 'Resume',
  COVER_LETTER: 'Cover Letter',
  OFFER_LETTER: 'Offer Letter',
  PORTFOLIO: 'Portfolio',
  OTHER: 'Other',
};

const TYPE_CLASSES: Record<string, string> = {
  OFFER_LETTER:
    'border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
  RESUME:
    'border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
  COVER_LETTER:
    'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  PORTFOLIO:
    'border-purple-200 dark:border-purple-500/25 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300',
  OTHER:
    'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 text-slate-600 dark:text-ink-200',
};

const OfferDocumentsPanel = ({
  applicationId,
  applicationLabel,
  companyName,
}: {
  applicationId?: number | null;
  applicationLabel?: string;
  companyName?: string;
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!applicationId) {
      setDocuments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getDocuments({ application: applicationId, page_size: 50 })
      .then((response) => {
        if (cancelled) return;
        const payload = response.data;
        const list: Document[] = Array.isArray(payload) ? payload : (payload?.results ?? []);
        // Offer letters are the reason this panel exists, so they lead.
        setDocuments(
          [...list].sort((a, b) => {
            const aOffer = a.document_type === 'OFFER_LETTER' ? 0 : 1;
            const bOffer = b.document_type === 'OFFER_LETTER' ? 0 : 1;
            return aOffer - bOffer || a.title.localeCompare(b.title);
          })
        );
      })
      .catch((error) => console.error('Failed to load offer documents', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId, reloadToken]);

  const openDocument = async (doc: Document) => {
    try {
      await openDocumentInNewTab(doc.id);
    } catch (error) {
      console.error('Failed to open document', error);
      message.error('Could not open that document');
    }
  };

  if (!applicationId) return null;

  return (
    // Inherits the section card's padding, so a hairline is all it needs.
    <div className="border-t border-slate-100 dark:border-white/[0.07] pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-400">
          <PaperClipOutlined /> Attached documents
        </span>
        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-700"
        >
          Add
        </button>
      </div>

      {loading ? (
        <div className="py-3 text-center">
          <Spin size="small" />
        </div>
      ) : documents.length === 0 ? (
        // One quiet line: attaching a file is optional, so it should not shout.
        <p className="mt-2 text-xs text-slate-400 dark:text-ink-500">
          None yet — use <span className="text-slate-500 dark:text-ink-400">Add</span> to attach the
          offer letter.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-1">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <FileTextOutlined className="shrink-0 text-slate-400 dark:text-ink-500" />
                {doc.file ? (
                  <button
                    type="button"
                    onClick={() => void openDocument(doc)}
                    className="truncate text-left text-[13px] text-blue-600 dark:text-blue-300 hover:text-blue-700 hover:underline"
                    title={doc.title}
                  >
                    {doc.title}
                  </button>
                ) : (
                  <span
                    className="truncate text-[13px] text-slate-700 dark:text-ink-100"
                    title={doc.title}
                  >
                    {doc.title}
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  TYPE_CLASSES[doc.document_type] ?? TYPE_CLASSES.OTHER
                }`}
              >
                {TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </span>
            </li>
          ))}
        </ul>
      )}

      <UploadDocumentModal
        visible={isUploadOpen}
        onCancel={() => setIsUploadOpen(false)}
        onSuccess={() => {
          setIsUploadOpen(false);
          setReloadToken((token) => token + 1);
        }}
        lockedApplicationId={applicationId ?? undefined}
        lockedApplicationLabel={applicationLabel}
        defaultTitle={companyName ? `${companyName} offer letter` : 'Offer letter'}
        defaultDocumentType="OFFER_LETTER"
      />
    </div>
  );
};

export default OfferDocumentsPanel;
