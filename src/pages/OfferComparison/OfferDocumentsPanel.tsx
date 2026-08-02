import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getDocuments } from '../../api/career';
import type { Document } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  RESUME: 'Resume',
  COVER_LETTER: 'Cover Letter',
  OFFER_LETTER: 'Offer Letter',
  PORTFOLIO: 'Portfolio',
  OTHER: 'Other',
};

const TYPE_CLASSES: Record<string, string> = {
  OFFER_LETTER: 'border-amber-200 bg-amber-50 text-amber-700',
  RESUME: 'border-blue-200 bg-blue-50 text-blue-700',
  COVER_LETTER: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PORTFOLIO: 'border-purple-200 bg-purple-50 text-purple-700',
  OTHER: 'border-slate-200 bg-slate-50 text-slate-600',
};

const OfferDocumentsPanel = ({ applicationId }: { applicationId?: number | null }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, [applicationId]);

  if (!applicationId) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <PaperClipOutlined /> Attached documents
        </span>
        <Link
          to={`/documents?application=${applicationId}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Manage
        </Link>
      </div>

      {loading ? (
        <div className="py-3 text-center">
          <Spin size="small" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-xs leading-5 text-slate-500">
          No documents yet. Upload the offer letter on the{' '}
          <Link to="/documents" className="font-semibold text-blue-600 hover:text-blue-700">
            Documents
          </Link>{' '}
          page and set its type to <strong>Offer Letter</strong> — it will show up here.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <FileTextOutlined className="shrink-0 text-slate-400" />
                {doc.file ? (
                  <a
                    href={doc.file}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[13px] text-blue-600 hover:text-blue-700"
                    title={doc.title}
                  >
                    {doc.title}
                  </a>
                ) : (
                  <span className="truncate text-[13px] text-slate-700" title={doc.title}>
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
    </div>
  );
};

export default OfferDocumentsPanel;
