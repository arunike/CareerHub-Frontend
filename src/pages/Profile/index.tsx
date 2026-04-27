import React, { useState, useEffect, useCallback } from 'react';
import {
  getUserSettings,
  updateUserSettings,
  changePassword,
  deleteAccount,
  exportAccountData,
  restoreAccountBackup,
} from '../../api';
import type { UserSettings } from '../../types';
import {
  UserOutlined,
  SaveOutlined,
  CloseOutlined,
  LockOutlined,
  MailOutlined,
  KeyOutlined,
  IdcardOutlined,
  SafetyOutlined,
  CameraOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileProtectOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, message, Modal, Tooltip } from 'antd';
import IdentityAvatar from '../../components/IdentityAvatar';
import PageActionToolbar from '../../components/PageActionToolbar';
import { useAuth } from '../../context/AuthContext';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data?.error === 'string'
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const base64ToBytes = (value: string) => Uint8Array.from(window.atob(value), (char) => char.charCodeAt(0));

const formatDeletionDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const encryptExport = async (plainText: string, passphrase: string) => {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 210000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText),
  );

  return JSON.stringify(
    {
      schema: 'careerhub.encrypted_export.v1',
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 210000,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    },
    null,
    2,
  );
};

const decryptExport = async (payload: {
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}, passphrase: string) => {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(payload.salt),
      iterations: payload.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext),
  );
  return new TextDecoder().decode(decrypted);
};

const ProfilePage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, updateProfile, logout } = useAuth();

  // User info state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [encryptedExportPassphrase, setEncryptedExportPassphrase] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const resp = await getUserSettings();
      const data = resp.data;
      if (!data.display_name && user?.full_name) {
        data.display_name = user.full_name;
      }
      setSettings(data);
    } catch {
      messageApi.error('Failed to fetch profile settings');
    } finally {
      setLoading(false);
    }
  }, [messageApi, user?.full_name]);

  useEffect(() => {
    fetchSettings();
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  }, [fetchSettings, user]);

  const handleSaveGeneral = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateUserSettings({ display_name: settings.display_name });
      await updateProfile({ first_name: firstName, last_name: lastName });
      window.dispatchEvent(new CustomEvent('settings-saved', { detail: { 
        display_name: settings.display_name,
        profile_picture: settings.profile_picture 
      }}));
      messageApi.success('Profile updated successfully!');
    } catch {
      messageApi.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      messageApi.warning('Please enter current and new passwords');
      return;
    }
    if (newPassword !== confirmPassword) {
      messageApi.error('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      messageApi.success('Password changed successfully! Logging out...');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Logout after a short delay so user can see the message
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePlainExport = async (format: 'json' | 'zip') => {
    setExporting(true);
    try {
      const resp = await exportAccountData(format);
      const extension = format === 'zip' ? 'zip' : 'json';
      downloadBlob(new Blob([resp.data]), `careerhub_account_export_${new Date().toISOString().slice(0, 10)}.${extension}`);
      messageApi.success('Account export downloaded.');
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, 'Failed to export account data'));
    } finally {
      setExporting(false);
    }
  };

  const handleEncryptedExport = async () => {
    if (encryptedExportPassphrase.trim().length < 8) {
      messageApi.warning('Use at least 8 characters for the encryption passphrase.');
      return;
    }
    setExporting(true);
    try {
      const resp = await exportAccountData('json');
      const plainText = await new Blob([resp.data]).text();
      const encrypted = await encryptExport(plainText, encryptedExportPassphrase);
      downloadBlob(
        new Blob([encrypted], { type: 'application/json' }),
        `careerhub_account_export_encrypted_${new Date().toISOString().slice(0, 10)}.json`,
      );
      setEncryptedExportPassphrase('');
      messageApi.success('Encrypted local export downloaded.');
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, 'Failed to create encrypted export'));
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      messageApi.warning('Choose a CareerHub export file first.');
      return;
    }
    setRestoring(true);
    try {
      const formData = new FormData();
      let uploadFile: Blob = restoreFile;
      let uploadName = restoreFile.name;
      if (restoreFile.name.toLowerCase().endsWith('.json')) {
        const rawText = await restoreFile.text();
        const maybeEncrypted = JSON.parse(rawText);
        if (maybeEncrypted.schema === 'careerhub.encrypted_export.v1') {
          if (!restorePassphrase) {
            messageApi.warning('Enter the passphrase for this encrypted export.');
            return;
          }
          const plainText = await decryptExport(maybeEncrypted, restorePassphrase);
          uploadFile = new Blob([plainText], { type: 'application/json' });
          uploadName = restoreFile.name.replace(/\.json$/i, '.decrypted.json');
        }
      }
      formData.append('file', uploadFile, uploadName);
      formData.append('mode', restoreMode);
      const resp = await restoreAccountBackup(formData);
      setRestoreFile(null);
      setRestorePassphrase('');
      messageApi.success(resp.data?.message || 'Backup restored.');
      fetchSettings();
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error, 'Failed to restore backup'));
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      messageApi.warning('Type DELETE to confirm account deletion.');
      return;
    }
    setDeleteModalOpen(false);
    Modal.confirm({
      title: 'Schedule account deletion?',
      content: 'Your account will be scheduled for permanent deletion in 14 days. Sign in again before then to cancel the deletion.',
      okText: 'Schedule deletion',
      okButtonProps: { danger: true },
      cancelText: 'Keep account',
      onOk: async () => {
        setDeleting(true);
        try {
          const resp = await deleteAccount('DELETE');
          const scheduledFor = formatDeletionDate(resp.data?.account_deletion_scheduled_for);
          messageApi.success(
            scheduledFor
              ? `Account deletion scheduled for ${scheduledFor}. Sign in before then to cancel.`
              : 'Account deletion scheduled. Sign in within 14 days to cancel.',
          );
          try {
            await logout();
          } catch {
            window.location.href = '/login';
          }
        } catch (error: unknown) {
          messageApi.error(getErrorMessage(error, 'Failed to delete account'));
        } finally {
          setDeleting(false);
        }
      },
      onCancel: () => {
        setDeleteConfirm('');
      },
    });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!settings) return <div className="text-center py-12 text-red-600">Failed to load profile</div>;

  const profileName =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : settings.display_name || user?.full_name || 'Update Your Name';
  const deletionScheduledFor = formatDeletionDate(settings.account_deletion_scheduled_for);
  return (
    <div className="max-w-6xl mx-auto pb-20">
      {contextHolder}
      <Modal
        title="Delete account"
        open={deleteModalOpen}
        okText="Continue"
        okButtonProps={{ danger: true, disabled: deleteConfirm !== 'DELETE', loading: deleting }}
        cancelText="Cancel"
        onOk={handleDeleteAccount}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteConfirm('');
        }}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm leading-relaxed text-slate-600">
            This schedules permanent account and server-side data deletion after a 14-day grace period.
            Sign in again before the deadline to cancel it. Type DELETE to enable the next step.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-950 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-400"
          />
        </div>
      </Modal>
      
      <PageActionToolbar
        title="Profile Settings"
        extraActions={
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSaveGeneral}
            className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 border-none shadow-lg shadow-indigo-200 font-semibold"
          >
            Save All Changes
          </Button>
        }
      />

      <div className="grid grid-cols-12 gap-8 mt-6">
        {/* Sidebar-style Profile Preview */}
        <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-8 lg:self-start">
          <div className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            <div className="absolute inset-x-0 top-0 h-px bg-slate-900/20" />

            <div className="relative p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="text-[11px] font-bold uppercase text-slate-400">Identity</p>
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Signed in
                </span>
              </div>

              <div className="mb-7 flex items-center gap-4">
                <div className="relative shrink-0 group">
                  <div className="h-20 w-20 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 p-1 transition-colors duration-200 group-hover:border-slate-300">
                    <IdentityAvatar
                      imageUrl={settings.profile_picture}
                      name={profileName}
                      email={user?.email}
                      alt="Profile"
                      size="lg"
                      className="h-full w-full border-0 p-0"
                    />
                    <label className="absolute inset-1 flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <CameraOutlined className="text-xl text-white" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('profile_picture', file);
                            setSaving(true);
                            try {
                              const resp = await updateUserSettings(formData);
                              setSettings(resp.data);
                              window.dispatchEvent(new CustomEvent('settings-saved', { detail: { 
                                display_name: resp.data.display_name,
                                profile_picture: resp.data.profile_picture 
                              }}));
                              messageApi.success('Photo updated!');
                            } catch { messageApi.error('Upload failed'); } finally { setSaving(false); }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {settings.profile_picture && (
                    <Tooltip title="Remove Photo">
                      <button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const resp = await updateUserSettings({ profile_picture: null });
                            setSettings(resp.data);
                            window.dispatchEvent(new CustomEvent('settings-saved', { detail: { 
                              display_name: resp.data.display_name,
                              profile_picture: resp.data.profile_picture 
                            }}));
                          } catch { messageApi.error('Error'); } finally { setSaving(false); }
                        }}
                        className="absolute -top-1 -right-1 bg-white p-1.5 rounded-full border border-slate-200 text-slate-400 hover:text-rose-500 transition-all hover:scale-110"
                      >
                        <CloseOutlined className="text-[10px]" />
                      </button>
                    </Tooltip>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-black leading-tight text-slate-950">
                    {profileName}
                  </h2>
                  <p className="mt-1 truncate text-sm font-medium text-slate-500">{user?.email}</p>
                  <div className="mt-4 h-px w-14 bg-slate-900" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white">
                <div className="grid grid-cols-[36px_1fr] items-center gap-3 border-b border-slate-100 px-4 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <MailOutlined className="text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Email</p>
                    <p className="truncate text-sm font-bold text-slate-800">{user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-[36px_1fr] items-center gap-3 px-4 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <SafetyOutlined className="text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Account Type</p>
                    <p className="text-sm font-bold text-slate-800">{user?.is_staff ? 'Administrator' : 'Standard User'}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </aside>

        {/* Form Area */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* General Section */}
          <section className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <IdcardOutlined />
              </div>
              <h3 className="text-base font-bold text-slate-800">Basic Information</h3>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Display Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserOutlined className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={settings.display_name || ''}
                    onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
                    className="w-full h-12 pl-11 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                    placeholder="Your public name"
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  This name will be visible on booking links and public profiles.
                </p>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <LockOutlined />
              </div>
              <h3 className="text-base font-bold text-slate-800">Security & Privacy</h3>
              <Tooltip title="Your password is encrypted using industry-standard hashing algorithms and is never stored in plain text.">
                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-600 cursor-help transition-all hover:bg-emerald-100">
                  <SafetyOutlined className="text-[12px]" />
                  ENCRYPTED
                </div>
              </Tooltip>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Current Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyOutlined className="text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-12 pl-11 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="default"
                  size="large"
                  icon={<LockOutlined />}
                  loading={passwordSaving}
                  onClick={handlePasswordChange}
                  className="rounded-xl h-11 text-xs font-bold border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2"
                >
                  Update Account Password
                </Button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <FileProtectOutlined />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Privacy & Export Center</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Export, restore, or permanently remove account data.</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {deletionScheduledFor && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                  <div className="flex items-start gap-3">
                    <SafetyOutlined className="text-lg text-amber-700 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-black text-amber-950">Deletion grace period active</h4>
                      <p className="text-xs text-amber-800/75 mt-1 leading-relaxed">
                        This account is scheduled for permanent deletion on {deletionScheduledFor}. Signing in before that date cancels the deletion.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
                  <div className="flex items-start gap-3">
                    <DownloadOutlined className="text-lg text-slate-700 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Account export</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Download a readable JSON or zipped backup of your CareerHub account.</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button loading={exporting} icon={<DownloadOutlined />} onClick={() => handlePlainExport('json')}>
                      JSON
                    </Button>
                    <Button loading={exporting} icon={<DownloadOutlined />} onClick={() => handlePlainExport('zip')}>
                      ZIP
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
                  <div className="flex items-start gap-3">
                    <LockOutlined className="text-lg text-slate-700 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Encrypted local export</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Encrypts the export in your browser before the file is saved locally.</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={encryptedExportPassphrase}
                      onChange={(e) => setEncryptedExportPassphrase(e.target.value)}
                      placeholder="Encryption passphrase"
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
                    />
                    <Button loading={exporting} icon={<FileProtectOutlined />} onClick={handleEncryptedExport}>
                      Encrypt
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <UploadOutlined className="text-lg text-slate-700 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Backup restore</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Restore a CareerHub account export. Merge keeps current records; replace clears current core data first. Encrypted JSON exports need their passphrase.</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
                  <input
                    type="file"
                    accept=".json,.zip,application/json,application/zip"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold file:text-slate-700"
                  />
                  <select
                    value={restoreMode}
                    onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
                  >
                    <option value="merge">Merge</option>
                    <option value="replace">Replace core data</option>
                  </select>
                  <Button loading={restoring} icon={<UploadOutlined />} onClick={handleRestore}>
                    Restore
                  </Button>
                </div>
                <input
                  type="password"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  placeholder="Passphrase for encrypted JSON restore (optional)"
                  className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
                />
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
                <div className="flex items-start gap-3">
                  <DeleteOutlined className="text-lg text-rose-600 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-rose-950">Delete account</h4>
                    <p className="text-xs text-rose-700/70 mt-1 leading-relaxed">
                      Schedule permanent deletion after 14 days. Sign in again before then to cancel.
                    </p>
                  </div>
                  <Button
                    danger
                    loading={deleting}
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setDeleteConfirm('');
                      setDeleteModalOpen(true);
                    }}
                  >
                    Delete account
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
