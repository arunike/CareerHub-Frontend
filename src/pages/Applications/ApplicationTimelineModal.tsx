import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Modal, Select, Spin, Tag, message } from 'antd';
import dayjs from 'dayjs';
import {
  createApplicationTimelineEntry,
  getApplicationTimeline,
  updateApplicationTimelineEntry,
} from '../../api';
import type { ApplicationTimelineEntry, ApplicationTimelineStage, Document } from '../../types';
import type { CareerApplication } from '../../types/application';

type Props = {
  application: CareerApplication | null;
  documents: Document[];
  open: boolean;
  onClose: () => void;
  appStages?: any[];
};

type TimelineDraft = {
  id?: number;
  event_date?: string | null;
  notes: string;
  documents: number[];
};



const emptyDraft = (): TimelineDraft => ({
  event_date: null,
  notes: '',
  documents: [],
});

const hasContent = (draft: TimelineDraft) =>
  Boolean(draft.id || draft.event_date || draft.notes.trim() || draft.documents.length > 0);

const ApplicationTimelineModal = ({ application, documents, open, onClose, appStages = [] }: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<ApplicationTimelineStage, TimelineDraft>>(() =>
    appStages.reduce(
      (acc, stage) => ({
        ...acc,
        [stage.key]: emptyDraft(),
      }),
      {} as Record<ApplicationTimelineStage, TimelineDraft>
    )
  );

  const companyName = application?.company_details?.name || 'Company';

  const documentOptions = useMemo(
    () =>
      documents.map((doc) => ({
        value: doc.id,
        label: `${doc.title}${doc.file_name ? ` · ${doc.file_name}` : ''}`,
      })),
    [documents]
  );

  const selectedDocumentById = useMemo(
    () =>
      documents.reduce<Record<number, Document>>((acc, doc) => {
        acc[doc.id] = doc;
        return acc;
      }, {}),
    [documents]
  );

  const buildInitialDrafts = useCallback(
    (entries: ApplicationTimelineEntry[]) => {
      const next = appStages.reduce(
        (acc, stage) => ({
          ...acc,
          [stage.key]: emptyDraft(),
        }),
        {} as Record<ApplicationTimelineStage, TimelineDraft>
      );

      for (const entry of entries) {
        if (!next[entry.stage]) next[entry.stage] = emptyDraft();
        next[entry.stage] = {
          id: entry.id,
          event_date: entry.event_date || null,
          notes: entry.notes || '',
          documents: entry.documents || [],
        };
      }

      if (next.APPLIED && !next.APPLIED.event_date && application?.date_applied) {
        next.APPLIED.event_date = application.date_applied;
      }

      return next;
    },
    [application?.date_applied, appStages]
  );

  const loadTimeline = useCallback(async () => {
    if (!application) return;
    setLoading(true);
    try {
      const response = await getApplicationTimeline(application.id);
      setDrafts(buildInitialDrafts(response.data));
    } catch (error) {
      messageApi.error('Failed to load timeline');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [application, buildInitialDrafts, messageApi]);

  useEffect(() => {
    if (open) {
      void loadTimeline();
    }
  }, [loadTimeline, open]);

  const patchDraft = (stage: ApplicationTimelineStage, patch: Partial<TimelineDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        ...patch,
      },
    }));
  };

  const allDisplayStages = useMemo(() => {
    const existingKeys = new Set(appStages.map(s => s.key));
    const extraStages = Object.keys(drafts)
      .filter(k => !existingKeys.has(k) && hasContent(drafts[k]))
      .map(k => ({
        key: k,
        label: k.charAt(0) + k.slice(1).toLowerCase() + ' (Legacy)',
        shortLabel: k.slice(0, 5),
        tone: 'bg-gray-300'
      }));
    return [...appStages, ...extraStages];
  }, [appStages, drafts]);

  const handleSave = async () => {
    if (!application) return;
    setSaving(true);
    try {
      await Promise.all(
        allDisplayStages.map((stage) => {
          const draft = drafts[stage.key];
          const payload = {
            application: application.id,
            stage: stage.key,
            event_date: draft.event_date || null,
            notes: draft.notes,
            documents: draft.documents,
          };

          if (draft.id) {
            return updateApplicationTimelineEntry(draft.id, payload);
          }
          if (hasContent(draft)) {
            return createApplicationTimelineEntry(payload);
          }
          return Promise.resolve();
        })
      );

      messageApi.success('Timeline saved');
      await loadTimeline();
    } catch (error) {
      messageApi.error('Failed to save timeline');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const activeStages = useMemo(() => {
    return allDisplayStages.filter(
      (stage) => hasContent(drafts[stage.key]) || application?.status === stage.key
    );
  }, [drafts, application?.status, allDisplayStages]);

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      width={960}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          Save Timeline
        </Button>,
      ]}
    >
      {contextHolder}
      <div className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200">
        <div className="bg-slate-50/50 px-6 sm:px-8 py-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Company Timeline</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{companyName}</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              {application?.role_title || 'Role'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : (
          <div className="relative py-8 px-6 sm:px-8 bg-slate-50/30">
            {/* Vertical connecting line */}
            <div className="absolute top-[4.5rem] bottom-10 left-[35px] sm:left-[43px] w-[2px] bg-slate-200 rounded-full" />
            
            <div className="space-y-6">
              {activeStages.map((stage) => {
                const draft = drafts[stage.key];
                const isCurrent = application?.status === stage.key;
                return (
                  <div key={stage.key} className="relative flex items-start gap-4 sm:gap-6 group">
                    {/* The Dot */}
                    <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 mt-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${stage.tone} ${isCurrent ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* The Card */}
                    <div className={`flex-1 rounded-2xl border ${isCurrent ? 'border-blue-300 shadow-md bg-white' : 'border-slate-200 bg-white/70'} p-4 sm:p-5 transition-all hover:border-slate-300 hover:shadow-md hover:bg-white`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-[13px] font-bold tracking-widest text-slate-800 uppercase">
                            {stage.label}
                          </h3>
                          {isCurrent && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <DatePicker
                          value={draft.event_date ? dayjs(draft.event_date) : null}
                          onChange={(value) =>
                            patchDraft(stage.key, {
                              event_date: value ? value.format('YYYY-MM-DD') : null,
                            })
                          }
                          className="w-full sm:w-40 rounded-xl"
                          placeholder="Select date"
                        />
                      </div>

                      <div className="space-y-3">
                        <Input.TextArea
                          value={draft.notes}
                          onChange={(event) => patchDraft(stage.key, { notes: event.target.value })}
                          placeholder={`Add notes for ${stage.label.toLowerCase()}...`}
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          className="!rounded-xl"
                        />

                        <Select
                          mode="multiple"
                          allowClear
                          value={draft.documents}
                          options={documentOptions}
                          onChange={(value) => patchDraft(stage.key, { documents: value })}
                          placeholder="Attach documents to this stage"
                          optionFilterProp="label"
                          className="w-full [&_.ant-select-selector]:!rounded-xl"
                        />

                        {draft.documents.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {draft.documents.map((docId) => {
                              const doc = selectedDocumentById[docId];
                              if (!doc) return null;
                              return (
                                <Tag key={docId} color="blue" className="rounded-md px-2 border-blue-200 bg-blue-50 text-blue-700">
                                  {doc.title}
                                </Tag>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ApplicationTimelineModal;
