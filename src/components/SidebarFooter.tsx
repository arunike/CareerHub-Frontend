import type React from 'react';
import { Button, Tooltip } from 'antd';
import { LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import IdentityAvatar from './IdentityAvatar';
import ThemeSwitch from '../theme/ThemeSwitch';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  displayName: string;
  isDesktopSidebarCollapsed: any;
  isLoggingOut: boolean;
  logout: any;
  navigate: any;
  notificationBell: any;
  profilePic: string | null;
  setIsLoggingOut: React.Dispatch<React.SetStateAction<boolean>>;
  user: any;
  // The footer owns the active state, so /settings still reads as the current page.
  settingsActive: boolean;
};

const FOOTER_ACTION =
  '!flex !h-11 !min-w-0 !items-center !justify-center !gap-2 !rounded-xl !border !text-xs !font-bold transition-all';

const FOOTER_NEUTRAL = '!bg-white dark:!bg-ink-900';

// Tinted, not outlined: an outline reads as a peer of Settings until you hover it.
const FOOTER_DANGER =
  '!border-rose-200 dark:!border-rose-500/30 !bg-rose-50 dark:!bg-rose-500/[0.12] !text-rose-700 dark:!text-rose-300 hover:!border-rose-300 dark:hover:!border-rose-500/50 hover:!bg-rose-100 dark:hover:!bg-rose-500/20 hover:!text-rose-800 dark:hover:!text-rose-200';

const SidebarFooter = ({
  displayName,
  isDesktopSidebarCollapsed,
  isLoggingOut,
  logout,
  navigate,
  notificationBell,
  profilePic,
  setIsLoggingOut,
  user,
  settingsActive,
}: Props) => {
  const { preference, setPreference } = useTheme();
  return (
    <div
      className={
        isDesktopSidebarCollapsed
          ? 'border-t border-slate-200/70 dark:border-white/[0.08] py-4 px-0'
          : 'border-t border-slate-200/70 dark:border-white/[0.08] p-4'
      }
    >
      {isDesktopSidebarCollapsed ? (
        <div className="flex flex-col items-center justify-center gap-3 w-full">
          <Tooltip title="Color theme" placement="right">
            <span>
              <ThemeSwitch compact value={preference} onChange={setPreference} />
            </span>
          </Tooltip>
          {notificationBell}
          <Tooltip title={displayName || user?.full_name || 'Profile'} placement="right">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label="Open profile"
              className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/75 dark:bg-ink-900/75 shadow-sm transition-all hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-900/5"
            >
              <IdentityAvatar
                imageUrl={profilePic}
                name={displayName || user?.full_name}
                email={user?.email}
                size="sm"
              />
            </button>
          </Tooltip>
          <Tooltip title="Settings" placement="right">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              aria-current={settingsActive ? 'page' : undefined}
              className={`!h-10 !w-12 !rounded-xl ${
                settingsActive
                  ? '!bg-blue-50 dark:!bg-blue-500/10 !text-blue-600 dark:!text-blue-300'
                  : '!text-slate-400 dark:!text-ink-500 hover:!bg-slate-100 dark:hover:!bg-ink-800 hover:!text-slate-600 dark:hover:!text-ink-200'
              }`}
            />
          </Tooltip>
          <Tooltip title="Sign out" placement="right">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              loading={isLoggingOut}
              onClick={async () => {
                setIsLoggingOut(true);
                try {
                  await logout();
                  navigate('/login', { replace: true });
                } finally {
                  setIsLoggingOut(false);
                }
              }}
              aria-label="Sign out"
              className="!h-10 !w-12 !rounded-xl !border !border-rose-200 dark:!border-rose-500/30 !bg-rose-50 dark:!bg-rose-500/[0.12] !text-rose-700 dark:!text-rose-300 hover:!border-rose-300 dark:hover:!border-rose-500/50 hover:!bg-rose-100 dark:hover:!bg-rose-500/20"
            />
          </Tooltip>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <span className="enterprise-data-label">Appearance</span>
            <ThemeSwitch value={preference} onChange={setPreference} />
          </div>
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="enterprise-data-label">Notifications</span>
            {notificationBell}
          </div>
          <div className="mb-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-ink-900 px-3 py-3 shadow-sm">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="group mb-3 flex min-h-11 w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <IdentityAvatar
                imageUrl={profilePic}
                name={displayName || user?.full_name}
                email={user?.email}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-black uppercase leading-none tracking-widest text-slate-400 dark:text-ink-500">
                  Account
                </p>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-ink-50 transition-colors group-hover:text-blue-600">
                  {displayName || 'CareerHub User'}
                </p>
              </div>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => navigate('/settings')}
                aria-current={settingsActive ? 'page' : undefined}
                className={`${FOOTER_ACTION} ${
                  settingsActive
                    ? `${FOOTER_NEUTRAL} !border-blue-200 dark:!border-blue-500/25 !bg-blue-50/60 dark:!bg-blue-500/10 !text-blue-600 dark:!text-blue-300`
                    : `${FOOTER_NEUTRAL} !border-slate-200/80 dark:!border-white/[0.08] !text-slate-500 dark:!text-ink-400 hover:!border-blue-100 dark:hover:!border-blue-500/20 hover:!bg-blue-50/30 dark:hover:!bg-blue-500/10 hover:!text-blue-600 dark:hover:!text-blue-300`
                }`}
              >
                Settings
              </Button>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                loading={isLoggingOut}
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsLoggingOut(true);
                  try {
                    await logout();
                    navigate('/login', { replace: true });
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
                className={`${FOOTER_ACTION} ${FOOTER_DANGER}`}
              >
                Sign Out
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium text-slate-300 dark:text-ink-600">
            © 2026 CareerHub
          </p>
        </>
      )}
    </div>
  );
};

export default SidebarFooter;
