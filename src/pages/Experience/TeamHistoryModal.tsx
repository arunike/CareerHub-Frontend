import React, { useState, useEffect } from 'react';
import { Modal, Button, DatePicker, Input, Switch, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TeamEntry } from '../../types';

const { TextArea } = Input;

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyEntry(): Omit<TeamEntry, 'id'> {
  return {
    name: '',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: null,
    is_current: false,
    norms: '',
    manager: '',
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  experienceName: string;
  entries: TeamEntry[];
  onSave: (entries: TeamEntry[]) => Promise<void>;
  isIntern?: boolean;
  expStartDate?: string | null;
  expEndDate?: string | null;
  expIsCurrent?: boolean;
}

const TeamHistoryModal: React.FC<Props> = ({ open, onClose, experienceName, entries, onSave, isIntern, expStartDate, expEndDate, expIsCurrent }) => {
  const [local, setLocal] = useState<TeamEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<TeamEntry, 'id'>>(emptyEntry());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocal([...entries]);
      setEditingId(null);
      setForm(emptyEntry());
    }
  }, [open, entries]);

  const startAdd = () => {
    setEditingId('__new__');
    setForm({
      ...emptyEntry(),
      ...(isIntern && {
        start_date: expStartDate || dayjs().format('YYYY-MM-DD'),
        end_date: expEndDate ?? null,
        is_current: expIsCurrent ?? false,
      }),
    });
  };

  const startEdit = (entry: TeamEntry) => {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      start_date: entry.start_date,
      end_date: entry.end_date ?? null,
      is_current: entry.is_current,
      norms: entry.norms,
      manager: entry.manager ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyEntry());
  };

  const commitEdit = () => {
    if (!form.name.trim()) return;
    if (editingId === '__new__') {
      setLocal(prev => [...prev, { ...form, id: nanoid() }]);
    } else {
      setLocal(prev => prev.map(e => e.id === editingId ? { ...form, id: editingId } : e));
    }
    setEditingId(null);
    setForm(emptyEntry());
  };

  const handleDelete = (id: string) => {
    setLocal(prev => prev.filter(e => e.id !== id));
  };

  const toggleLock = (id: string) => {
    setLocal(prev => prev.map(e => e.id === id ? { ...e, is_locked: !e.is_locked } : e));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(local);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string | null | undefined) => d ? dayjs(d).format('MMM YYYY') : '—';

  const isFormEditing = editingId !== null;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <TeamOutlined className="text-blue-500" />
          <span>Team History — <span className="font-normal text-gray-500">{experienceName}</span></span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={760}
      footer={
        <div className="flex justify-between items-center">
          <Button onClick={startAdd} icon={<PlusOutlined />} disabled={isFormEditing}>
            Add Team
          </Button>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 mt-2">
        {/* Entry form */}
        {isFormEditing && (
          <div className="border border-blue-200 rounded-xl bg-blue-50/40 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Name *</label>
                <Input
                  placeholder="e.g. Platform Team"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Manager</label>
                <Input
                  placeholder="e.g. Jane Smith"
                  value={form.manager ?? ''}
                  onChange={e => setForm(f => ({ ...f, manager: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currently on this team</label>
                <div className="flex items-center gap-2 h-8">
                  <Switch
                    size="small"
                    checked={form.is_current}
                    onChange={v => setForm(f => ({ ...f, is_current: v, end_date: v ? null : f.end_date }))}
                  />
                  <span className="text-sm text-gray-500">{form.is_current ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {isIntern && (
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                Dates auto-filled from experience ({fmtDate(expStartDate)} – {expIsCurrent ? 'Present' : fmtDate(expEndDate)})
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <DatePicker
                  className="w-full"
                  picker="month"
                  value={form.start_date ? dayjs(form.start_date) : null}
                  onChange={d => setForm(f => ({ ...f, start_date: d ? d.format('YYYY-MM-DD') : '' }))}
                />
              </div>
              {!form.is_current && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <DatePicker
                    className="w-full"
                    picker="month"
                    value={form.end_date ? dayjs(form.end_date) : null}
                    onChange={d => setForm(f => ({ ...f, end_date: d ? d.format('YYYY-MM-DD') : null }))}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Team Norms & Standards</label>
              <TextArea
                rows={5}
                placeholder="Describe the team's working norms, processes, standards, on-call expectations, code review practices, deployment cadence, etc."
                value={form.norms}
                onChange={e => setForm(f => ({ ...f, norms: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button size="small" onClick={cancelEdit}>Cancel</Button>
              <Button size="small" type="primary" onClick={commitEdit} disabled={!form.name.trim()}>
                {editingId === '__new__' ? 'Add' : 'Update'}
              </Button>
            </div>
          </div>
        )}

        {/* Entry list */}
        {local.length === 0 && !isFormEditing && (
          <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            No teams recorded yet. Click "Add Team" to get started.
          </div>
        )}

        {local.map(entry => (
          <div
            key={entry.id}
            className={`border rounded-xl p-4 transition-all group ${
              editingId === entry.id
                ? 'hidden'
                : entry.is_locked
                  ? 'border-amber-100 bg-amber-50/30'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-base font-semibold text-gray-900">{entry.name}</span>
                  {entry.is_current && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                      Current
                    </span>
                  )}
                  {entry.is_locked && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200 flex items-center gap-1">
                      <LockOutlined style={{ fontSize: 9 }} /> Locked
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2 flex-wrap">
                  <span>{fmtDate(entry.start_date)} – {entry.is_current ? 'Present' : fmtDate(entry.end_date)}</span>
                  {entry.manager && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>Manager: <span className="font-medium text-gray-600">{entry.manager}</span></span>
                    </>
                  )}
                </div>
                {entry.norms && (
                  <p className="text-[15px] text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-3">{entry.norms}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {entry.is_locked ? (
                  <Tooltip title="Unlock entry">
                    <Button
                      type="text"
                      size="small"
                      icon={<LockOutlined />}
                      onClick={() => toggleLock(entry.id)}
                      className="text-amber-500!"
                    />
                  </Tooltip>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Tooltip title="Lock entry">
                      <Button
                        type="text"
                        size="small"
                        icon={<UnlockOutlined />}
                        onClick={() => toggleLock(entry.id)}
                        disabled={isFormEditing}
                        className="text-gray-300!"
                      />
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startEdit(entry)}
                        disabled={isFormEditing}
                        className="text-gray-400 hover:text-blue-500"
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Remove this team entry?"
                      onConfirm={() => handleDelete(entry.id)}
                      okText="Remove"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Delete">
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={isFormEditing}
                          className="text-gray-400 hover:text-red-500"
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default TeamHistoryModal;
