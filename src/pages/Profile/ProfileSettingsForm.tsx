import type React from 'react';
import type { UserSettings } from '../../types';
import {
  UserOutlined,
  LockOutlined,
  KeyOutlined,
  IdcardOutlined,
  SafetyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileProtectOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

type Props = {
  confirmPassword: string;
  deleting: boolean;
  deletionScheduledFor: string | null;
  encryptedExportPassphrase: string;
  exporting: boolean;
  firstName: string;
  handleEncryptedExport: () => void;
  handlePasswordChange: () => void;
  handlePlainExport: (format: 'json' | 'zip') => void;
  handleRestore: () => void;
  lastName: string;
  loading: boolean;
  newPassword: string;
  oldPassword: string;
  passwordSaving: boolean;
  restoreMode: 'merge' | 'replace';
  restorePassphrase: string;
  restoring: boolean;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<string>>;
  setDeleteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEncryptedExportPassphrase: React.Dispatch<React.SetStateAction<string>>;
  setFirstName: React.Dispatch<React.SetStateAction<string>>;
  setLastName: React.Dispatch<React.SetStateAction<string>>;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  setOldPassword: React.Dispatch<React.SetStateAction<string>>;
  setRestoreFile: React.Dispatch<React.SetStateAction<File | null>>;
  setRestoreMode: React.Dispatch<React.SetStateAction<'merge' | 'replace'>>;
  setRestorePassphrase: React.Dispatch<React.SetStateAction<string>>;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  settings: UserSettings;
};

const ProfileSettingsForm = ({
  confirmPassword,
  deleting,
  deletionScheduledFor,
  encryptedExportPassphrase,
  exporting,
  firstName,
  handleEncryptedExport,
  handlePasswordChange,
  handlePlainExport,
  handleRestore,
  lastName,
  newPassword,
  oldPassword,
  passwordSaving,
  restoreMode,
  restorePassphrase,
  restoring,
  setConfirmPassword,
  setDeleteConfirm,
  setDeleteModalOpen,
  setEncryptedExportPassphrase,
  setFirstName,
  setLastName,
  setNewPassword,
  setOldPassword,
  setRestoreFile,
  setRestoreMode,
  setRestorePassphrase,
  setSettings,
  settings,
}: Props) => (
  <div className="profile-settings-content col-span-12 space-y-4 sm:space-y-8 lg:col-span-8">
    {/* General Section */}
    <section className="bg-white dark:bg-ink-900 rounded-[24px] border border-slate-200/60 dark:border-white/[0.08] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-50 dark:border-white/[0.07] px-4 py-4 sm:px-8 sm:py-6">
        <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-300">
          <IdcardOutlined />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-ink-50">Basic Information</h3>
      </div>

      <div className="space-y-6 p-4 sm:space-y-8 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-ink-400 ml-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/20 dark:bg-ink-900/20 px-4 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500 transition-all placeholder:text-slate-300"
              placeholder="Enter first name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-ink-400 ml-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/20 dark:bg-ink-900/20 px-4 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500 transition-all placeholder:text-slate-300"
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-slate-500 dark:text-ink-400 ml-1">
            Display Name
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <UserOutlined className="text-slate-300 dark:text-ink-600 group-focus-within:text-sky-500 transition-colors" />
            </div>
            <input
              type="text"
              value={settings.display_name || ''}
              onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
              className="w-full h-12 pl-11 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/20 dark:bg-ink-900/20 px-4 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500 transition-all"
              placeholder="Your public name"
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-ink-500 ml-1 flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-ink-700" />
            This name will be visible on booking links and public profiles.
          </p>
        </div>
      </div>
    </section>

    {/* Security Section */}
    <section className="bg-white dark:bg-ink-900 rounded-[24px] border border-slate-200/60 dark:border-white/[0.08] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-50 dark:border-white/[0.07] px-4 py-4 sm:px-8 sm:py-6">
        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-300">
          <LockOutlined />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-ink-50">Security & Privacy</h3>
        <Tooltip title="Your password is encrypted using industry-standard hashing algorithms and is never stored in plain text.">
          <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 cursor-help transition-all hover:bg-emerald-100">
            <SafetyOutlined className="text-[12px]" />
            ENCRYPTED
          </div>
        </Tooltip>
      </div>

      <div className="space-y-6 p-4 sm:p-8">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-ink-400 ml-1">
            Current Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <KeyOutlined className="text-slate-300 dark:text-ink-600 group-focus-within:text-rose-500 transition-colors" />
            </div>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full h-12 pl-11 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/20 dark:bg-ink-900/20 px-4 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-ink-400 ml-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/20 dark:bg-ink-900/20 px-4 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-ink-400 ml-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/20 dark:bg-ink-900/20 px-4 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500 transition-all"
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
            className="rounded-xl h-11 text-xs font-bold border-slate-200 dark:border-white/[0.08] hover:border-sky-500 hover:text-sky-600 transition-all flex items-center gap-2"
          >
            Update Account Password
          </Button>
        </div>
      </div>
    </section>

    <section className="bg-white dark:bg-ink-900 rounded-[24px] border border-slate-200/60 dark:border-white/[0.08] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-50 dark:border-white/[0.07] px-4 py-4 sm:px-8 sm:py-6">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-ink-800 flex items-center justify-center text-slate-700 dark:text-ink-100">
          <FileProtectOutlined />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-ink-50">
            Privacy & Export Center
          </h3>
          <p className="text-xs font-medium text-slate-400 dark:text-ink-500 mt-0.5">
            Export, restore, or permanently remove account data.
          </p>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-8">
        {deletionScheduledFor && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <SafetyOutlined className="text-lg text-amber-700 dark:text-amber-300 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-amber-950">Deletion grace period active</h4>
                <p className="text-xs text-amber-800/75 dark:text-amber-300 mt-1 leading-relaxed">
                  This account is scheduled for permanent deletion on {deletionScheduledFor}.
                  Signing in before that date cancels the deletion.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/40 dark:bg-ink-900/40 p-5">
            <div className="flex items-start gap-3">
              <DownloadOutlined className="text-lg text-slate-700 dark:text-ink-100 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-ink-50">
                  Account export
                </h4>
                <p className="text-xs text-slate-500 dark:text-ink-400 mt-1 leading-relaxed">
                  Download a readable JSON or zipped backup of your CareerHub account.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                loading={exporting}
                icon={<DownloadOutlined />}
                onClick={() => handlePlainExport('json')}
              >
                JSON
              </Button>
              <Button
                loading={exporting}
                icon={<DownloadOutlined />}
                onClick={() => handlePlainExport('zip')}
              >
                ZIP
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/40 dark:bg-ink-900/40 p-5">
            <div className="flex items-start gap-3">
              <LockOutlined className="text-lg text-slate-700 dark:text-ink-100 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-ink-50">
                  Encrypted local export
                </h4>
                <p className="text-xs text-slate-500 dark:text-ink-400 mt-1 leading-relaxed">
                  Encrypts the export in your browser before the file is saved locally.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={encryptedExportPassphrase}
                onChange={(e) => setEncryptedExportPassphrase(e.target.value)}
                placeholder="Encryption passphrase"
                className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500"
              />
              <Button
                loading={exporting}
                icon={<FileProtectOutlined />}
                onClick={handleEncryptedExport}
              >
                Encrypt
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <UploadOutlined className="text-lg text-slate-700 dark:text-ink-100 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-ink-50">Backup restore</h4>
              <p className="text-xs text-slate-500 dark:text-ink-400 mt-1 leading-relaxed">
                Restore a CareerHub account export. Merge keeps current records; replace clears
                current core data first. Encrypted JSON exports need their passphrase.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
            <input
              type="file"
              accept=".json,.zip,application/json,application/zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-ink-200 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold file:text-slate-700"
            />
            <select
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
              className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 text-xs font-bold text-slate-700 dark:text-ink-100"
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
            className="mt-3 h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 px-3 text-sm font-semibold text-slate-900 dark:text-ink-50 focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-500"
          />
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/25 bg-rose-50/40 dark:bg-rose-500/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
            <DeleteOutlined className="text-lg text-rose-600 dark:text-rose-300 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black text-rose-950">Delete account</h4>
              <p className="text-xs text-rose-700/70 dark:text-rose-300 mt-1 leading-relaxed">
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
              className="w-full sm:w-auto"
            >
              Delete account
            </Button>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default ProfileSettingsForm;
