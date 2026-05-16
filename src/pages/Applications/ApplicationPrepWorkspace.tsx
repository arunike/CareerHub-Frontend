import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, List, Progress, Spin, Tag, Typography, message } from 'antd';
import {
  BulbOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  LinkOutlined,
  ProfileOutlined,
  ReadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { downloadDocument, getApplicationPrepWorkspace } from '../../api';
import type { AIArtifact, ApplicationPrepWorkspace as PrepWorkspace } from '../../api/career';
import type { Document } from '../../types';
import type { CareerApplication } from '../../types/application';
import { formatDateOnly } from '../../utils/dateOnly';
import JDMatcherModal from '../Experience/JDMatcherModal';

type Props = {
  application: CareerApplication;
  onGenerateCoverLetter: (application: CareerApplication) => void;
};

const { Text } = Typography;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const asText = (value: unknown, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const getSkillLabel = (value: unknown) => (isRecord(value) ? asText(value.skill) : asText(value));

const getMissingSkillLabel = (value: unknown) =>
  isRecord(value) ? asText(value.skill) : asText(value);

const scoreColor = (score: number) => {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

const artifactPayload = (artifact?: AIArtifact | null) => artifact?.payload || {};

const Section = ({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="border-t border-slate-100 px-5 py-5 first:border-t-0">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[15px] font-bold text-slate-950">
          <span className="text-sm text-slate-400">{icon}</span>
          {title}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyBlock = ({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3.5 py-3">
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <p className="m-0 mt-0.5 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const ApplicationPrepWorkspace = ({ application, onGenerateCoverLetter }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [workspace, setWorkspace] = useState<PrepWorkspace | null>(null);
  const [jdMatcherOpen, setJdMatcherOpen] = useState(false);

  const loadWorkspace = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const response = await getApplicationPrepWorkspace(application.id);
        setWorkspace(response.data);
      } catch (error) {
        messageApi.error('Failed to load prep workspace');
        console.error(error);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [application.id, messageApi]
  );

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await getApplicationPrepWorkspace(application.id);
        if (!canceled) setWorkspace(response.data);
      } catch (error) {
        if (!canceled) {
          messageApi.error('Failed to load prep workspace');
          console.error(error);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    void load();
    return () => {
      canceled = true;
    };
  }, [application.id, messageApi]);

  const latestPayload = artifactPayload(workspace?.latest_jd_report);
  const fitScore = Number(latestPayload.score ?? 0);
  const matchedSkills = workspace?.evidence.matched_skills || [];
  const missingSkills = workspace?.evidence.missing_skills || [];
  const bestExperiences = workspace?.evidence.best_experiences || [];
  const tailoredBullets = workspace?.evidence.tailored_bullets || [];
  const latestCoverLetter = workspace?.cover_letters?.[0] || null;
  const coverLetterText = asText(artifactPayload(latestCoverLetter).coverLetter);

  const readinessItems = useMemo(
    () => [
      { label: 'JD fit', done: Boolean(workspace?.latest_jd_report) },
      { label: 'Resume/docs', done: Boolean(workspace?.readiness.linked_documents) },
      { label: 'Cover letter', done: Boolean(workspace?.readiness.cover_letters) },
      { label: 'Timeline', done: Boolean(workspace?.readiness.timeline_entries) },
      { label: 'Notes', done: Boolean(workspace?.readiness.has_notes) },
    ],
    [workspace]
  );
  const completedReadiness = readinessItems.filter((item) => item.done).length;
  const readinessPercent = Math.round((completedReadiness / readinessItems.length) * 100);

  const openDocument = async (record: Document) => {
    try {
      const response = await downloadDocument(record.id);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      messageApi.error('Failed to open document');
      console.error(error);
    }
  };

  if (loading && !workspace) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        {contextHolder}
        <Spin />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="py-4">
        {contextHolder}
        <EmptyBlock
          icon={<WarningOutlined />}
          title="Prep workspace unavailable"
          description="The workspace data could not be loaded for this application."
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {contextHolder}

      <section className="px-5 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Application Prep
            </div>
          </div>
          <div className="w-full md:w-48">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Ready</span>
              <span>
                {completedReadiness}/{readinessItems.length}
              </span>
            </div>
            <Progress
              className="!mb-0"
              percent={readinessPercent}
              showInfo={false}
              strokeColor="#0ea5e9"
              trailColor="#e2e8f0"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {readinessItems.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                item.done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {item.done && <CheckCircleOutlined />}
              {item.label}
            </span>
          ))}
        </div>
      </section>

      <Section
        title="JD Fit & Evidence"
        icon={<ProfileOutlined />}
        action={
          <Button
            size="small"
            type={workspace.latest_jd_report ? 'default' : 'primary'}
            onClick={() => setJdMatcherOpen(true)}
          >
            {workspace.latest_jd_report ? 'Run again' : 'Run JD Matcher'}
          </Button>
        }
      >
        {!workspace.latest_jd_report &&
        bestExperiences.length === 0 &&
        tailoredBullets.length === 0 ? (
          <EmptyBlock
            icon={<ProfileOutlined />}
            title="No analysis yet"
            description="Run JD Matcher for this application to add fit score and extract evidence."
          />
        ) : (
          <div className="space-y-6">
            {workspace.latest_jd_report && (
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <Progress
                    type="circle"
                    size={70}
                    percent={Math.max(0, Math.min(100, fitScore))}
                    strokeColor={scoreColor(fitScore)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900">
                      {workspace.latest_jd_report.title || 'Latest JD report'}
                    </div>
                    <p className="m-0 mt-1 line-clamp-2 text-sm text-slate-500">
                      {asText(latestPayload.summary) ||
                        workspace.latest_jd_report.summary ||
                        'No summary saved.'}
                    </p>
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline"
                      href={`/jd-report/${workspace.latest_jd_report.client_id}`}
                    >
                      <LinkOutlined /> Open report
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.slice(0, 5).map((skill, index) => (
                    <Tag key={`${getSkillLabel(skill)}-${index}`} color="green">
                      {getSkillLabel(skill)}
                    </Tag>
                  ))}
                  {missingSkills.slice(0, 4).map((skill, index) => (
                    <Tag key={`${getMissingSkillLabel(skill)}-${index}`} color="gold">
                      {getMissingSkillLabel(skill)}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {(bestExperiences.length > 0 || tailoredBullets.length > 0) && (
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <BulbOutlined className="text-sm text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Resume Evidence
                  </span>
                </div>
                <div className="grid gap-2">
                  {bestExperiences.slice(0, 3).map((item, index) => (
                    <div key={index} className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <div className="text-sm font-bold text-slate-900">
                        {asText(item.title, 'Experience')}{' '}
                        {item.company ? `@ ${asText(item.company)}` : ''}
                      </div>
                      <p className="m-0 mt-1 line-clamp-2 text-sm text-slate-500">
                        {asText(item.relevance)}
                      </p>
                    </div>
                  ))}
                  {tailoredBullets.slice(0, 3).map((item, index) => {
                    const reason = asText(item.reason);
                    return (
                      <div key={`bullet-${index}`} className="rounded-lg bg-sky-50 px-3 py-2.5">
                        <div className="text-xs font-bold uppercase text-sky-700">
                          Suggested Bullet
                        </div>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {asText(item.revised)}
                        </p>
                        {reason && (
                          <p className="m-0 mt-1 line-clamp-2 text-xs text-slate-500">{reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Documents" icon={<FileTextOutlined />}>
        {workspace.documents.length === 0 ? (
          <EmptyBlock
            icon={<FileTextOutlined />}
            title="No linked documents"
            description="Attach resumes or prep docs from Documents."
          />
        ) : (
          <List
            dataSource={workspace.documents}
            renderItem={(documentRecord) => (
              <List.Item
                className="!border-slate-100 !px-0"
                actions={[
                  <Button key="open" size="small" onClick={() => openDocument(documentRecord)}>
                    Open
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<span className="font-semibold">{documentRecord.title}</span>}
                  description={documentRecord.file_name || documentRecord.document_type}
                />
                <Tag>{documentRecord.document_type}</Tag>
              </List.Item>
            )}
          />
        )}
      </Section>

      <Section
        title="Cover Letter"
        icon={<ReadOutlined />}
        action={
          <Button
            size="small"
            type={latestCoverLetter ? 'default' : 'primary'}
            onClick={() => onGenerateCoverLetter(application)}
          >
            {latestCoverLetter ? 'Generate new' : 'Generate letter'}
          </Button>
        }
      >
        {latestCoverLetter ? (
          <div>
            <div className="font-bold text-slate-900">{latestCoverLetter.title}</div>
            <p className="m-0 mt-2 line-clamp-4 whitespace-pre-line text-sm text-slate-500">
              {coverLetterText || latestCoverLetter.summary || 'Cover letter saved.'}
            </p>
          </div>
        ) : (
          <EmptyBlock
            icon={<ReadOutlined />}
            title="No cover letter"
            description="Generate a draft when you are ready."
          />
        )}
      </Section>

      <Section title="Notes & Timeline" icon={<WarningOutlined />}>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
              Notes
            </div>
            <p className="m-0 line-clamp-3 text-sm text-slate-600">
              {workspace.notes.replace(/<[^>]*>/g, ' ').trim() || 'No notes saved.'}
            </p>
          </div>
          <div className="space-y-2">
            {workspace.timeline.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800">{entry.stage_label}</span>
                  <span className="mx-1.5 text-slate-300">/</span>
                  <span className="text-xs text-slate-500">
                    {formatDateOnly(entry.event_date || '', 'No date')}
                  </span>
                </div>
              </div>
            ))}
            {workspace.timeline.length === 0 && <Text type="secondary">No timeline entries.</Text>}
          </div>
        </div>
      </Section>

      <JDMatcherModal
        open={jdMatcherOpen}
        application={application}
        onCancel={() => setJdMatcherOpen(false)}
        onSaved={() => {
          void loadWorkspace(false);
        }}
      />
    </div>
  );
};

export default ApplicationPrepWorkspace;
