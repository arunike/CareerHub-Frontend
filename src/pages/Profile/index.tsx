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
import { SaveOutlined } from '@ant-design/icons';
import { message } from 'antd';
import Modal from '../../components/MobileModal';
import PageActionToolbar from '../../components/PageActionToolbar';
import { PageState } from '../../components/PageState';
import { SettingsSkeleton } from '../../components/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import ProfilePreviewCard from './ProfilePreviewCard';
import ProfileSettingsForm from './ProfileSettingsForm';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data?.error ===
      'string'
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

const base64ToBytes = (value: string) =>
  Uint8Array.from(window.atob(value), (char) => char.charCodeAt(0));

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
    ['deriveKey']
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
    ['encrypt']
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
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
    2
  );
};

const decryptExport = async (
  payload: {
    iterations: number;
    salt: string;
    iv: string;
    ciphertext: string;
  },
  passphrase: string
) => {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
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
    ['decrypt']
  );
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext)
  );
  return new TextDecoder().decode(decrypted);
};

const ProfilePage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, updateProfile, logout } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

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
      window.dispatchEvent(
        new CustomEvent('settings-saved', {
          detail: {
            display_name: settings.display_name,
            profile_picture: settings.profile_picture,
          },
        })
      );
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
      downloadBlob(
        new Blob([resp.data]),
        `careerhub_account_export_${new Date().toISOString().slice(0, 10)}.${extension}`
      );
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
        `careerhub_account_export_encrypted_${new Date().toISOString().slice(0, 10)}.json`
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
      content:
        'Your account will be scheduled for permanent deletion in 14 days. Sign in again before then to cancel the deletion.',
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
              : 'Account deletion scheduled. Sign in within 14 days to cancel.'
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

  if (loading) return <SettingsSkeleton />;
  if (!settings) {
    return (
      <>
        {contextHolder}
        <PageState
          tone="error"
          title="Profile could not be loaded"
          description="Your saved profile was not changed. Check your connection and try loading it again."
          actionLabel="Retry loading profile"
          onAction={() => {
            setLoading(true);
            void fetchSettings();
          }}
          className="mt-12"
        />
      </>
    );
  }

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
          <p className="text-sm leading-relaxed text-slate-600 dark:text-ink-200">
            This schedules permanent account and server-side data deletion after a 14-day grace
            period. Sign in again before the deadline to cancel it. Type DELETE to enable the next
            step.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="h-11 w-full rounded-xl border border-rose-200 dark:border-rose-500/25 bg-white dark:bg-ink-900 px-3 text-sm font-semibold text-rose-950 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-400"
          />
        </div>
      </Modal>

      <PageActionToolbar
        title="Profile Settings"
        subtitle="Manage your identity, security, and private account data."
        onPrimaryAction={handleSaveGeneral}
        primaryActionLabel="Save Changes"
        primaryActionIcon={<SaveOutlined />}
        primaryActionLoading={saving}
      />

      <div className="mt-6 grid grid-cols-12 gap-4 sm:gap-8">
        {/* Sidebar-style Profile Preview */}
        <ProfilePreviewCard
          profileName={profileName}
          messageApi={messageApi}
          setSaving={setSaving}
          setSettings={setSettings}
          settings={settings}
          user={user}
        />

        {/* Form Area */}
        <ProfileSettingsForm
          confirmPassword={confirmPassword}
          deleting={deleting}
          deletionScheduledFor={deletionScheduledFor}
          encryptedExportPassphrase={encryptedExportPassphrase}
          exporting={exporting}
          firstName={firstName}
          handleEncryptedExport={handleEncryptedExport}
          handlePasswordChange={handlePasswordChange}
          handlePlainExport={handlePlainExport}
          handleRestore={handleRestore}
          lastName={lastName}
          loading={loading}
          newPassword={newPassword}
          oldPassword={oldPassword}
          passwordSaving={passwordSaving}
          restoreMode={restoreMode}
          restorePassphrase={restorePassphrase}
          restoring={restoring}
          setConfirmPassword={setConfirmPassword}
          setDeleteConfirm={setDeleteConfirm}
          setDeleteModalOpen={setDeleteModalOpen}
          setEncryptedExportPassphrase={setEncryptedExportPassphrase}
          setFirstName={setFirstName}
          setLastName={setLastName}
          setNewPassword={setNewPassword}
          setOldPassword={setOldPassword}
          setRestoreFile={setRestoreFile}
          setRestoreMode={setRestoreMode}
          setRestorePassphrase={setRestorePassphrase}
          setSettings={setSettings}
          settings={settings}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
