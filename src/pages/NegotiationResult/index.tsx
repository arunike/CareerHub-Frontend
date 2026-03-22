import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { getNegotiationResultById } from '../../utils/negotiationStorage';
import type { StoredNegotiationResult } from '../../utils/negotiationStorage';
import BulkActionHeader from '../../components/BulkActionHeader';

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
    className="rounded-2xl border p-6 flex flex-col gap-4 shadow-sm"
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

  useEffect(() => {
    if (id) setResult(getNegotiationResultById(id));
  }, [id]);

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400">
        <ThunderboltOutlined style={{ fontSize: 48 }} />
        <p className="text-lg text-gray-500">Result not found.</p>
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/ai-tools?tab=negotiation-results')}
          style={{ background: '#6366f1', borderColor: '#6366f1' }}
        >
          View All Results
        </Button>
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
      {/* Top bar */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm px-6 py-3">
        <BulkActionHeader
          selectedCount={0}
          totalCount={0}
          title={
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/ai-tools?tab=negotiation-results')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-sm font-medium transition-all"
              >
                <ArrowLeftOutlined /> All Results
              </button>
              <span className="text-gray-200 select-none">|</span>
              <div className="flex items-center gap-2">
                <ThunderboltOutlined style={{ color: '#6366f1', fontSize: 15 }} />
                <span className="text-sm font-semibold text-gray-700">Negotiation Advisor</span>
              </div>
            </div>
          }
          defaultActions={
            <Button
              icon={<UnorderedListOutlined />}
              onClick={() => navigate('/ai-tools?tab=negotiation-results')}
              className="rounded-lg"
            >
              All Results
            </Button>
          }
        />
      </div>

      {/* Page */}
      <div className="min-h-screen bg-slate-50/50 py-12 px-4 shadow-inner">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">

          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4 shadow-sm">
              <ThunderboltOutlined className="text-indigo-500 text-xs" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                AI Negotiation Advisory Report
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight tracking-tight">
              {displayTitle}
            </h1>
            <div className="flex items-center gap-3 text-gray-400 text-xs font-medium">
              <span>{date}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>Negotiation Advisor</span>
            </div>
          </div>

          {/* Offer snapshot */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <DollarOutlined className="text-gray-500 text-sm" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Offer Snapshot</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Base Salary', value: fmt(snap.base_salary) },
                { label: 'Bonus', value: fmt(snap.bonus) },
                { label: 'Equity / yr', value: fmt(snap.equity) },
                { label: 'Sign-On', value: fmt(snap.sign_on) },
                { label: 'PTO', value: snap.pto_days ? `${snap.pto_days} days` : null },
              ]
                .filter((x) => x.value)
                .map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 min-w-[90px]"
                  >
                    <Text type="secondary" className="text-[10px] uppercase tracking-wider mb-1">
                      {label}
                    </Text>
                    <Text strong className="text-base">
                      {value}
                    </Text>
                  </div>
                ))}
            </div>
          </div>

          {/* Suggested Counter-Ask */}
          {ask && (
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <DollarOutlined className="text-indigo-600 text-sm" />
                </div>
                <span className="font-semibold text-indigo-700 text-sm">Suggested Counter-Ask</span>
              </div>
              <div className="flex flex-wrap gap-4 mb-3">
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
                      className="flex flex-col items-center bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 min-w-[90px]"
                    >
                      <Text type="secondary" className="text-[10px] uppercase tracking-wider mb-1">
                        {label}
                      </Text>
                      <Text strong style={{ color: '#6366f1' }} className="text-base">
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

          <p className="text-center text-xs text-gray-400 pb-4">
            CareerHub AI · {date}
          </p>
        </div>
      </div>
    </>
  );
};

export default NegotiationResultPage;
