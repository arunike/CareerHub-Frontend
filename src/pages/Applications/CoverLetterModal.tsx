import { useState } from 'react';
import { Modal, Button, Input, Typography, Space, message, Tag } from 'antd';
import {
  CopyOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { getExperiences } from '../../api/career';
import { generateCoverLetterWithBrowserAI } from '../../lib/browserAi';
import { saveCoverLetter } from '../../utils/coverLetterStorage';
import type { CareerApplication } from '../../types/application';

const { TextArea } = Input;
const { Text } = Typography;

interface Props {
  application: CareerApplication;
  open: boolean;
  onClose: () => void;
}

const wordCount = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

const CoverLetterModal = ({ application, open, onClose }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [jdText, setJdText] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setCoverLetter('');
    setSaved(false);
    setCopied(false);
    try {
      const experiencesResponse = await getExperiences();
      const letter = await generateCoverLetterWithBrowserAI({
        application,
        jdText,
        experiences: experiencesResponse.data,
      });
      setCoverLetter(letter);
      saveCoverLetter(
        application.id,
        application.company_details?.name ?? '',
        application.role_title,
        letter,
        jdText,
      );
      setSaved(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate cover letter. Check your browser AI provider settings.';
      messageApi.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setJdText('');
    setCoverLetter('');
    setSaved(false);
    setCopied(false);
    onClose();
  };

  const hasLetter = coverLetter && !loading;

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#6366f1' }} />
          <span>
            Cover Letter — {application.role_title} at{' '}
            {application.company_details?.name}
          </span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={760}
      afterClose={handleClose}
    >
      {contextHolder}

      {/* JD Input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Paste the job description for a tailored letter, or leave blank for a general one.
          </Text>
          {jdText && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {wordCount(jdText).toLocaleString()} words
            </Text>
          )}
        </div>
        <TextArea
          rows={5}
          placeholder="Paste job description here (optional)..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          style={{ borderRadius: 8, fontSize: 13, resize: 'none' }}
        />
      </div>

      {/* Generate / Regenerate button */}
      <Button
        type="primary"
        icon={hasLetter ? <ReloadOutlined /> : <ThunderboltOutlined />}
        onClick={handleGenerate}
        loading={loading}
        block
        style={{
          height: 44,
          borderRadius: 10,
          background: '#4f46e5',
          borderColor: '#4f46e5',
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 20,
        }}
      >
        {loading ? 'Writing…' : hasLetter ? 'Regenerate' : 'Generate Cover Letter'}
      </Button>

      {/* Loading skeleton */}
      {loading && (
        <div style={{
          background: 'linear-gradient(135deg, #f5f3ff, #eef2ff)',
          border: '1px solid #e0e7ff',
          borderRadius: 12,
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✍️</div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Crafting your cover letter…
          </Text>
        </div>
      )}

      {/* Result */}
      {hasLetter && (
        <div>
          {/* Result header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}>
            <Space size={8}>
              <Text strong style={{ fontSize: 13 }}>Generated Cover Letter</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {wordCount(coverLetter).toLocaleString()} words
              </Text>
              {saved && (
                <Tag color="green" icon={<SaveOutlined />} style={{ fontSize: 11, lineHeight: '18px' }}>
                  Saved
                </Tag>
              )}
            </Space>
            <Button
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
              style={copied ? { color: '#059669', borderColor: '#059669' } : {}}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* Letter body */}
          <div style={{
            background: '#fafafa',
            border: '1px solid #e8e8e8',
            borderRadius: 10,
            padding: '20px 24px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.85,
            fontSize: 14,
            color: '#1f2937',
            maxHeight: 420,
            overflowY: 'auto',
          }}>
            {coverLetter}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CoverLetterModal;
