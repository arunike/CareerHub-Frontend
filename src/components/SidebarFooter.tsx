import type React from 'react';
import { Button, Tooltip } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import IdentityAvatar from './IdentityAvatar';

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
};

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
}: Props) => (
  <div
    className={
      isDesktopSidebarCollapsed
        ? 'border-t border-slate-200/70 py-4 px-0'
        : 'border-t border-slate-200/70 p-4'
    }
  >
    {isDesktopSidebarCollapsed ? (
      <div className="flex flex-col items-center justify-center gap-3 w-full">
        {notificationBell}
        <Tooltip title={displayName || user?.full_name || 'Profile'} placement="right">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Open profile"
            className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200/80 bg-white/75 shadow-sm transition-all hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-900/5"
          >
            <IdentityAvatar
              imageUrl={profilePic}
              name={displayName || user?.full_name}
              email={user?.email}
              size="sm"
            />
          </button>
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
            className="!h-10 !w-12 !rounded-xl !text-slate-400 hover:!text-rose-500 hover:!bg-rose-50"
          />
        </Tooltip>
      </div>
    ) : (
      <>
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="enterprise-data-label">Notifications</span>
          {notificationBell}
        </div>
        <div className="mb-4 rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm">
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
              <p className="mb-1 text-[10px] font-black uppercase leading-none tracking-widest text-slate-400">
                Account
              </p>
              <p className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                {displayName || 'CareerHub User'}
              </p>
            </div>
          </button>
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
            className="w-full !flex !h-11 !items-center !justify-center !rounded-xl !border !border-slate-200/80 !bg-white !text-xs !font-bold !text-slate-500 transition-all hover:!border-rose-100 hover:!bg-rose-50/30 hover:!text-rose-500"
          >
            Sign Out
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] font-medium text-slate-300">© 2026 CareerHub</p>
      </>
    )}
  </div>
);

export default SidebarFooter;
