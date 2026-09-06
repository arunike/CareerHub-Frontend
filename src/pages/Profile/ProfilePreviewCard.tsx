import type { AuthenticatedUser } from '../../api/auth';
import type { MessageInstance } from 'antd/es/message/interface';
import type React from 'react';
import { updateUserSettings } from '../../api';
import type { UserSettings } from '../../types';
import { CloseOutlined, MailOutlined, SafetyOutlined, CameraOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import IdentityAvatar from '../../components/IdentityAvatar';

type Props = {
  profileName: string;
  messageApi: MessageInstance;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  settings: UserSettings;
  user: AuthenticatedUser | null;
};

const ProfilePreviewCard = ({
  setSaving,
  setSettings,
  settings,
  user,
  profileName,
  messageApi,
}: Props) => (
  <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-8 lg:self-start">
    <div className="relative overflow-hidden rounded-[18px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900">
      <div className="absolute inset-x-0 top-0 h-px bg-slate-900/20" />

      <div className="relative p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-ink-500">
            Identity
          </p>
          <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-ink-400">
            Signed in
          </span>
        </div>

        <div className="mb-7 flex items-center gap-4">
          <div className="relative shrink-0 group">
            <div className="h-20 w-20 overflow-hidden rounded-[20px] border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-1 transition-colors duration-200 group-hover:border-slate-300">
              <IdentityAvatar
                imageUrl={settings.profile_picture}
                name={profileName}
                email={user?.email}
                alt="Profile"
                size="lg"
                className="h-full w-full border-0 p-0"
              />
              <label
                className="absolute bottom-1 right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-slate-950/70 opacity-100 transition-opacity duration-200 lg:inset-1 lg:h-auto lg:w-auto lg:rounded-2xl lg:opacity-0 lg:group-hover:opacity-100"
                aria-label="Upload profile photo"
              >
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
                        window.dispatchEvent(
                          new CustomEvent('settings-saved', {
                            detail: {
                              display_name: resp.data.display_name,
                              profile_picture: resp.data.profile_picture,
                            },
                          })
                        );
                        messageApi.success('Photo updated!');
                      } catch {
                        messageApi.error('Upload failed');
                      } finally {
                        setSaving(false);
                      }
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
                      window.dispatchEvent(
                        new CustomEvent('settings-saved', {
                          detail: {
                            display_name: resp.data.display_name,
                            profile_picture: resp.data.profile_picture,
                          },
                        })
                      );
                    } catch {
                      messageApi.error('Error');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-slate-500 dark:text-ink-400 transition hover:text-rose-500 lg:-right-1 lg:-top-1 lg:h-8 lg:w-8"
                  aria-label="Remove profile photo"
                >
                  <CloseOutlined className="text-[10px]" />
                </button>
              </Tooltip>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black leading-tight text-slate-950 dark:text-ink-50">
              {profileName}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-ink-400">
              {user?.email}
            </p>
            <div className="mt-4 h-px w-14 bg-slate-900" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-ink-900">
          <div className="grid grid-cols-[36px_1fr] items-center gap-3 border-b border-slate-100 dark:border-white/[0.07] px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-ink-900 text-slate-500 dark:text-ink-400">
              <MailOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-ink-500">
                Email
              </p>
              <p className="truncate text-sm font-bold text-slate-800 dark:text-ink-50">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-[36px_1fr] items-center gap-3 px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-ink-900 text-slate-500 dark:text-ink-400">
              <SafetyOutlined className="text-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-ink-500">
                Account Type
              </p>
              <p className="text-sm font-bold text-slate-800 dark:text-ink-50">
                {user?.is_staff ? 'Administrator' : 'Standard User'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
);

export default ProfilePreviewCard;
