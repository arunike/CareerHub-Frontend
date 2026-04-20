import { useState } from 'react';
import { Modal, Button, Spin, Typography, Tag, Alert } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  DollarOutlined,
  SaveOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getExperiences, getOffers } from '../../api/career';
import type { NegotiationAdvice } from '../../api/career';
import { generateNegotiationAdviceWithBrowserAI } from '../../lib/browserAi';
import type { OfferLike as Offer, ApplicationLike as Application } from './calculations';
import { saveNegotiationResult } from '../../utils/negotiationStorage';
import { formatPtoLabel } from '../../utils/offerTimeOff';

const { Text } = Typography;

interface Props {
  offer: Offer;
  application: Application | undefined;
  open: boolean;
  onClose: () => void;
}

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toLocaleString()}` : null;

const Section = ({
  icon,
  label,
  color,
  bg,
  border,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
  items: string[];
}) => (
  <div className={`rounded-xl border p-4 flex flex-col gap-3`} style={{ background: bg, borderColor: border }}>
    <div className="flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <Text strong style={{ color }}>
        {label}
      </Text>
      <Tag style={{ marginLeft: 'auto', background: bg, borderColor: border, color }} className="font-bold">
        {items.length}
      </Tag>
    </div>
    <ul className="m-0 pl-4 flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700 leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const NegotiationAdvisorModal = ({ offer, application, open, onClose }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<NegotiationAdvice | null>(null);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!offer.id) return;
    setLoading(true);
    setError('');
    setAdvice(null);
    setSavedId(null);
    try {
      const [experiencesResponse, offersResponse] = await Promise.all([
        getExperiences(),
        getOffers(),
      ]);
      const currentOffer =
        (offersResponse.data as Offer[]).find(
          (candidate) => candidate.is_current && candidate.id !== offer.id
        ) || null;
      const data = await generateNegotiationAdviceWithBrowserAI({
        offer,
        application,
        experiences: experiencesResponse.data,
        currentOffer,
      });
      setAdvice(data);
      const saved = saveNegotiationResult(
        offer.id,
        application?.company_name ?? '',
        application?.role_title ?? '',
        {
          base_salary: Number(offer.base_salary),
          bonus: Number(offer.bonus),
          equity: Number(offer.equity),
          sign_on: Number(offer.sign_on),
          pto_days: offer.pto_days ?? 0,
          is_unlimited_pto: !!offer.is_unlimited_pto,
        },
        data,
      );
      setSavedId(saved.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to generate advice. Check your browser AI provider settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdvice(null);
    setError('');
    setSavedId(null);
    onClose();
  };

  const companyName = application?.company_name || 'this company';
  const roleTitle = application?.role_title || 'this role';

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ThunderboltOutlined style={{ color: '#6366f1' }} />
          <span>Negotiation Advisor — {roleTitle} at {companyName}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={720}
    >
      {/* Offer snapshot */}
      <div className="flex gap-4 flex-wrap justify-center mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
        {[
          { label: 'Base', value: fmt(Number(offer.base_salary)) },
          { label: 'Bonus', value: fmt(Number(offer.bonus)) },
          { label: 'Equity/yr', value: fmt(Number(offer.equity)) },
          { label: 'Sign-On', value: fmt(Number(offer.sign_on)) },
          { label: 'PTO', value: formatPtoLabel(offer.pto_days, !!offer.is_unlimited_pto) },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center min-w-[72px]">
            <Text type="secondary" className="text-xs uppercase tracking-wider">{label}</Text>
            <Text strong>{value}</Text>
          </div>
        ))}
      </div>

      {!advice && !loading && (
        <div className="flex flex-col gap-3">
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleGenerate}
            style={{ background: '#6366f1', borderColor: '#6366f1' }}
          >
            Generate Negotiation Advice
          </Button>
          {error && (
            <Alert
              type="error"
              showIcon
              message="Generation Failed"
              description={error}
              action={
                <Button size="small" danger onClick={handleGenerate}>
                  Retry
                </Button>
              }
            />
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spin size="large" />
          <Text type="secondary">Analyzing your offer and crafting strategy…</Text>
        </div>
      )}

      {advice && !loading && (
        <div className="flex flex-col gap-4">
          {/* Suggested Ask */}
          {advice.suggested_ask && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarOutlined style={{ color: '#6366f1' }} />
                <Text strong style={{ color: '#6366f1' }}>
                  Suggested Counter-Ask
                </Text>
              </div>
              <div className="flex gap-4 flex-wrap mb-2">
                {[
                  { label: 'Base', value: fmt(advice.suggested_ask.base_salary) },
                  { label: 'Sign-On', value: fmt(advice.suggested_ask.sign_on) },
                  { label: 'Equity/yr', value: fmt(advice.suggested_ask.equity) },
                  { label: 'PTO', value: advice.suggested_ask.pto_days ? `${advice.suggested_ask.pto_days} days` : null },
                ]
                  .filter((x) => x.value)
                  .map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center min-w-[80px] bg-white rounded-lg border border-indigo-100 px-3 py-2">
                      <Text type="secondary" className="text-xs uppercase tracking-wider">{label}</Text>
                      <Text strong style={{ color: '#6366f1' }}>{value}</Text>
                    </div>
                  ))}
              </div>
              {advice.suggested_ask.notes && (
                <Text type="secondary" className="text-xs">{advice.suggested_ask.notes}</Text>
              )}
            </div>
          )}

          {advice.leverage_points.length > 0 && (
            <Section
              icon={<CheckCircleOutlined />}
              label="Your Leverage Points"
              color="#059669"
              bg="#f0fdf4"
              border="#a7f3d0"
              items={advice.leverage_points}
            />
          )}

          {advice.talking_points.length > 0 && (
            <Section
              icon={<BulbOutlined />}
              label="Talking Points & Scripts"
              color="#d97706"
              bg="#fffbeb"
              border="#fde68a"
              items={advice.talking_points}
            />
          )}

          {advice.caution_points.length > 0 && (
            <Section
              icon={<WarningOutlined />}
              label="Watch Out For"
              color="#dc2626"
              bg="#fef2f2"
              border="#fecaca"
              items={advice.caution_points}
            />
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleGenerate}>
              Regenerate
            </Button>
            {savedId && (
              <>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <SaveOutlined /> Saved
                </span>
                <Button
                  size="small"
                  type="link"
                  icon={<ArrowRightOutlined />}
                  onClick={() => { handleClose(); navigate(`/negotiation-result/${savedId}`); }}
                  style={{ padding: 0 }}
                >
                  View Full Report
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default NegotiationAdvisorModal;
