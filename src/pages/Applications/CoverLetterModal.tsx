import { useState } from 'react';
import { Modal, Button, Input, Typography, Space, message, Spin } from 'antd';
import { CopyOutlined, ThunderboltOutlined, SaveOutlined } from '@ant-design/icons';
import { generateCoverLetter } from '../../api/career';
import { saveCoverLetter } from '../../utils/coverLetterStorage';
import type { CareerApplication } from '../../types/application';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface Props {
  application: CareerApplication;
  open: boolean;
  onClose: () => void;
}

const CoverLetterModal = ({ application, open, onClose }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [jdText, setJdText] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setCoverLetter('');
    setSaved(false);
    try {
      const res = await generateCoverLetter(application.id, jdText);
      const letter = res.data.cover_letter;
      setCoverLetter(letter);
      saveCoverLetter(
        application.id,
        application.company_details?.name ?? '',
        application.role_title,
        letter,
        jdText,
      );
      setSaved(true);
    } catch {
      messageApi.error('Failed to generate cover letter. Check your LLM configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    messageApi.success('Copied to clipboard');
  };

  const handleClose = () => {
    setJdText('');
    setCoverLetter('');
    setSaved(false);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#6366f1' }} />
          <span>
            Generate Cover Letter — {application.role_title} at{' '}
            {application.company_details?.name}
          </span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={760}
    >
      {contextHolder}

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Paste the job description for a tailored letter, or leave blank for a general one.
        </Text>
        <TextArea
          rows={5}
          placeholder="Paste job description here (optional)..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </div>

      <Button
        type="primary"
        onClick={handleGenerate}
        loading={loading}
        style={{ marginBottom: 20 }}
      >
        Generate
      </Button>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin tip="Writing your cover letter..." />
        </div>
      )}

      {coverLetter && !loading && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Space>
              <Text strong>Generated Cover Letter</Text>
              {saved && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <SaveOutlined style={{ marginRight: 4 }} />
                  Saved to Cover Letters
                </Text>
              )}
            </Space>
            <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
              Copy
            </Button>
          </div>
          <div
            style={{
              background: '#f9f9f9',
              border: '1px solid #e8e8e8',
              borderRadius: 6,
              padding: '16px 20px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.8,
              fontSize: 14,
              maxHeight: 420,
              overflowY: 'auto',
            }}
          >
            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{coverLetter}</Paragraph>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CoverLetterModal;
