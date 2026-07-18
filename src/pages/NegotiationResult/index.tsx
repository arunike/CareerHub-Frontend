import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  DollarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { getNegotiationResultById } from '../../utils/negotiationStorage';
import type { StoredNegotiationResult } from '../../utils/negotiationStorage';
import { getNegotiationArtifactByClientId } from '../../utils/aiArtifactStorage';
import { formatPtoLabel } from '../../utils/offerTimeOff';
import ArtifactHeaderCard from '../../components/ArtifactHeaderCard';
import ArtifactPageToolbar from '../../components/ArtifactPageToolbar';
import { PageState, PanelSkeleton } from '../../components/PageState';

const { Text } = Typography;

const fmt = (n: number | null | undefined) =>
  n != null && n !== 0 ? `$${Number(n).toLocaleString()}` : null;

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
  items: string[];
}

const Section = ({ icon, label, color, bg, border, items }: SectionProps) => (
  <div
    className="flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:p-6"
    style={{ background: bg, borderColor: border }}
  >
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${color}22` }}
      >
        <span style={{ color, fontSize: 14 }}>{icon}</span>
      </div>
      <span className="font-semibold text-gray-800 text-sm">{label}</span>
      <span
        className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border"
        style={{ color, borderColor: `${color}44`, background: 'white' }}
      >
        {items.length}
      </span>
    </div>
    <ul className="m-0 pl-4 flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700 leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const NegotiationResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<StoredNegotiationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getNegotiationArtifactByClientId(id)
      .then((backendResult) => {
        setResult(backendResult || getNegotiationResultById(id));
      })
      .catch(() => setResult(getNegotiationResultById(id)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6">
        <PanelSkeleton rows={6} />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6">
        <PageState
          title="Negotiation result not found"
          description="This result may have been deleted or is no longer available in this account."
          icon={<ThunderboltOutlined />}
          actionLabel="View all negotiation results"
          onAction={() => navigate('/ai-tools?tab=negotiation-results')}
        />
      </div>
    );
  }

  const displayTitle = result.title || `${result.roleTitle} @ ${result.companyName}`;
  const date = new Date(result.savedAt).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const snap = result.offerSnapshot;
  const ask = result.advice.suggested_ask;

  return (
    <>
      <ArtifactPageToolbar
        backLabel="All Results"
        contextLabel="Negotiation Advisor"
        contextIcon={<ThunderboltOutlined />}
        onBack={() => navigate('/ai-tools?tab=negotiation-results')}
        maxWidthClassName="max-w-4xl"
      />

      {/* Page */}
      <div className="min-h-screen bg-slate-50/50 px-4 py-6 shadow-inner sm:py-12">
        <div className="mx-auto flex max-w-4xl flex-col gap-5 sm:gap-8">
          {/* Header */}
          <ArtifactHeaderCard
            typeLabel="AI Negotiation Advisory Report"
            typeIcon={<ThunderboltOutlined />}
            title={displayTitle}
            date={date}
            subtitle={`${result.roleTitle || 'Role'} @ ${result.companyName || 'Company'}`}
            themeColor="indigo"
          />

          {/* Offer snapshot */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <DollarOutlined className="text-gray-500 text-sm" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Offer Snapshot</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
              {[
                { label: 'Base Salary', value: fmt(snap.base_salary) },
                { label: 'Bonus', value: fmt(snap.bonus) },
                { label: 'Equity / yr', value: fmt(snap.equity) },
                { label: 'Sign-On', value: fmt(snap.sign_on) },
                {
                  label: 'PTO',
                  value: snap.is_unlimited_pto
                    ? 'Unlimited'
                    : snap.pto_days
                      ? formatPtoLabel(snap.pto_days)
                      : null,
                },
                {
                  label: 'Sick Leave',
                  value:
                    snap.is_unlimited_pto && snap.sick_leave_included_in_unlimited_pto !== false
                      ? 'Included'
                      : snap.sick_leave_days != null
                        ? `${snap.sick_leave_days} days`
                        : null,
                },
              ]
                .filter((x) => x.value)
                .map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex min-w-0 flex-col items-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 sm:min-w-[90px] sm:px-4"
                  >
                    <Text type="secondary" className="text-[10px] uppercase tracking-wider mb-1">
                      {label}
                    </Text>
                    <Text strong className="break-words text-center text-base">
                      {value}
                    </Text>
                  </div>
                ))}
            </div>
          </div>

          {/* Suggested Counter-Ask */}
          {ask && (
            <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                  <DollarOutlined className="text-sky-600 text-sm" />
                </div>
                <span className="font-semibold text-sky-700 text-sm">Suggested Counter-Ask</span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
                {[
                  { label: 'Base', value: fmt(ask.base_salary) },
                  { label: 'Sign-On', value: fmt(ask.sign_on) },
                  { label: 'Equity / yr', value: fmt(ask.equity) },
                  { label: 'PTO', value: ask.pto_days ? `${ask.pto_days} days` : null },
                ]
                  .filter((x) => x.value)
                  .map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex min-w-0 flex-col items-center rounded-xl border border-sky-100 bg-sky-50 px-3 py-3 sm:min-w-[90px] sm:px-4"
                    >
                      <Text type="secondary" className="text-[10px] uppercase tracking-wider mb-1">
                        {label}
                      </Text>
                      <Text
                        strong
                        style={{ color: '#0ea5e9' }}
                        className="break-words text-center text-base"
                      >
                        {value}
                      </Text>
                    </div>
                  ))}
              </div>
              {ask.notes && (
                <p className="text-gray-500 text-xs m-0 leading-relaxed">{ask.notes}</p>
              )}
            </div>
          )}

          {/* Sections */}
          {result.advice.leverage_points.length > 0 && (
            <Section
              icon={<CheckCircleOutlined />}
              label="Your Leverage Points"
              color="#059669"
              bg="#f0fdf4"
              border="#a7f3d0"
              items={result.advice.leverage_points}
            />
          )}

          {result.advice.talking_points.length > 0 && (
            <Section
              icon={<BulbOutlined />}
              label="Talking Points & Scripts"
              color="#d97706"
              bg="#fffbeb"
              border="#fde68a"
              items={result.advice.talking_points}
            />
          )}

          {result.advice.caution_points.length > 0 && (
            <Section
              icon={<WarningOutlined />}
              label="Watch Out For"
              color="#dc2626"
              bg="#fef2f2"
              border="#fecaca"
              items={result.advice.caution_points}
            />
          )}

          <p className="text-center text-xs text-gray-400 pb-4">CareerHub AI · {date}</p>
        </div>
      </div>
    </>
  );
};

export default NegotiationResultPage;
