import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Grid, ConfigProvider, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  LineChartOutlined,
  SettingOutlined,
  SolutionOutlined,
  DollarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  TrophyOutlined,
  RobotOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import IdentityAvatar from './IdentityAvatar';
import NotificationBell from './NotificationBell';
import logo from '../assets/logo.png';
import logoWithText from '../assets/logo_with_text.png';
import { getUserSettings } from '../api/availability';
import { useAuth } from '../context/AuthContext';

const { Sider, Content } = AntLayout;
const { useBreakpoint } = Grid;
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'careerhub.sidebar.collapsed';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(true);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>([]);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDesktopSidebarCollapsed = Boolean(screens.lg && desktopCollapsed);

  useEffect(() => {
    getUserSettings().then(res => {
      setHiddenNavItems(res.data.hidden_nav_items || []);
      setProfilePic(res.data.profile_picture);
      setDisplayName(res.data.display_name || user?.full_name || '');
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        if (detail.hidden_nav_items !== undefined) setHiddenNavItems(detail.hidden_nav_items);
        if (detail.profile_picture !== undefined) setProfilePic(detail.profile_picture);
        if (detail.display_name !== undefined) setDisplayName(detail.display_name);
      }
    };
    window.addEventListener('settings-saved', handler);
    return () => window.removeEventListener('settings-saved', handler);
  }, []);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (!screens.lg) {
      setCollapsed(true);
    }
  }, [location, screens.lg]);

  // Update collapsed state when screen size changes
  useEffect(() => {
    if (!screens.lg) {
      setCollapsed(true);
    }
  }, [screens.lg]);

  const menuItems = [
    {
      key: 'grp-1',
      label: 'Schedule',
      type: 'group' as const,
      children: [
        {
          key: '/',
          icon: <DashboardOutlined />,
          label: 'Availability',
        },
        {
          key: '/events',
          icon: <CalendarOutlined />,
          label: 'Events',
        },
        {
          key: '/holidays',
          icon: <ScheduleOutlined />,
          label: 'Holidays',
        },
      ],
    },
    {
      key: 'grp-2',
      label: 'Career & Growth',
      type: 'group' as const,
      children: [
        {
          key: '/applications',
          icon: <SolutionOutlined />,
          label: 'Applications',
        },
        { key: '/offers', icon: <DollarOutlined />, label: 'Offers' },
        { key: '/documents', icon: <FileTextOutlined />, label: 'Documents' },
        { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Action Items' },
        { key: '/experience', icon: <TrophyOutlined />, label: 'Experience' },
        {
          key: 'intelligence',
          icon: <RobotOutlined />,
          label: 'Intelligence',
          children: [
            { key: '/jd-reports', label: 'JD Reports' },
            { key: '/ai-tools?tab=cover-letters', label: 'Cover Letters' },
            { key: '/ai-tools?tab=negotiation-results', label: 'Negotiation Results' },
          ],
        },
      ],
    },
    {
      key: 'grp-3',
      label: 'Insights',
      type: 'group' as const,
      children: [
        {
          key: '/analytics',
          icon: <LineChartOutlined />,
          label: 'Analytics',
        },
      ],
    },
    {
      key: 'grp-4',
      type: 'group' as const,
      children: [
        {
          key: '/settings',
          icon: <SettingOutlined />,
          label: 'Settings',
        },
      ],
    },
  ];

  const isVisible = (key: string) =>
    key === '/settings' || location.pathname === key || !hiddenNavItems.includes(key);

  const filterChildren = (items: typeof menuItems[0]['children']) =>
    items?.filter(item => !('children' in item) || isVisible(item.key)
      ? isVisible(item.key)
      : false
    ).map(item =>
      'children' in item && item.children
        ? {
            ...item,
            children: (item.children as Array<{ key: string }>).filter((child) => isVisible(child.key)),
          }
        : item
    );

  const visibleMenuItems = menuItems.map(group => ({
    ...group,
    children: filterChildren(group.children),
  })).filter(group => (group.children?.length ?? 0) > 0);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
    }
  };

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  const activeKey = location.pathname + location.search;
  const intelligencePaths = ['/jd-reports', '/ai-tools', '/cover-letters'];
  const isIntelligence = intelligencePaths.some((p) => location.pathname.startsWith(p));
  const selectedKey =
    location.pathname === '/cover-letters' || activeKey === '/ai-tools'
      ? '/ai-tools?tab=cover-letters'
      : activeKey;
  const mobilePrimaryNavItems = [
    { key: '/', label: 'Home', icon: <DashboardOutlined /> },
    { key: '/applications', label: 'Apps', icon: <SolutionOutlined /> },
    { key: '/offers', label: 'Offers', icon: <DollarOutlined /> },
    { key: '/analytics', label: 'Insights', icon: <LineChartOutlined /> },
  ];
  const matchesNavKey = (key: string) =>
    key === '/' ? location.pathname === '/' : location.pathname.startsWith(key);
  const isMoreActive = !screens.lg && !mobilePrimaryNavItems.some((item) => matchesNavKey(item.key));

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div
        className={`shrink-0 border-b border-gray-50 ${
          isDesktopSidebarCollapsed
            ? 'h-[116px] px-3 py-4 flex flex-col items-center justify-center gap-3'
            : 'px-6 py-5 flex items-center justify-between'
        }`}
      >
        <img
          src={isDesktopSidebarCollapsed ? logo : logoWithText}
          alt="CareerHub"
          className={isDesktopSidebarCollapsed ? 'h-11 w-11 object-contain' : 'h-24'}
        />
        {screens.lg ? (
          <Tooltip title={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <Button
              type="text"
              icon={isDesktopSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleDesktopSidebar}
              aria-label={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="!h-9 !w-9 !rounded-xl !text-slate-400 hover:!text-indigo-600 hover:!bg-indigo-50"
            />
          </Tooltip>
        ) : (
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setCollapsed(true)}
            className="text-gray-400 hover:text-gray-600"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                itemHeight: 48,
                itemMarginInline: 16,
                itemMarginBlock: 4,
                collapsedWidth: 64,
                collapsedIconSize: 20,
                iconSize: 20,
                iconMarginInlineEnd: 16,
                fontSize: 16,
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            defaultOpenKeys={isIntelligence ? ['intelligence'] : []}
            inlineCollapsed={isDesktopSidebarCollapsed}
            items={visibleMenuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
            className="border-none bg-transparent"
          />
        </ConfigProvider>
      </div>

      <div className="p-4 border-t border-gray-100">
        {isDesktopSidebarCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <NotificationBell placement="top-left" />
            <Tooltip title={displayName || user?.full_name || 'Profile'} placement="right">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                aria-label="Open profile"
                className="h-11 w-11 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-center hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
              >
                <IdentityAvatar imageUrl={profilePic} name={displayName || user?.full_name} email={user?.email} size="sm" />
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
                className="!h-10 !w-10 !rounded-xl !text-slate-400 hover:!text-rose-500 hover:!bg-rose-50"
              />
            </Tooltip>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs text-gray-400 font-medium">Notifications</span>
              <NotificationBell placement="top-left" />
            </div>
            <div 
              onClick={() => navigate('/profile')}
              className="group px-3 py-4 rounded-[20px] bg-slate-50/50 border border-slate-100 mb-4 cursor-pointer hover:bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <IdentityAvatar imageUrl={profilePic} name={displayName || user?.full_name} email={user?.email} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Account</p>
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {displayName || 'CareerHub User'}
                  </p>
                </div>
              </div>
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
                className="w-full !flex !items-center !justify-center !h-9 !rounded-xl !bg-white !border !border-slate-100 !text-slate-400 hover:!text-rose-500 hover:!border-rose-100 hover:!bg-rose-50/30 !text-xs font-bold transition-all"
              >
                Sign Out
              </Button>
            </div>
            <p className="text-[10px] text-gray-300 text-center mt-2">© 2026 CareerHub</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <AntLayout style={{ minHeight: '100vh', flexDirection: 'row' }}>
      {/* Unified Sider */}
      <Sider
        width={260}
        theme="light"
        collapsible
        collapsed={screens.lg ? desktopCollapsed : collapsed}
        trigger={null}
        collapsedWidth={screens.lg ? 76 : 0}
        style={{
          height: '100vh',
          position: screens.lg ? 'sticky' : 'fixed',
          top: 0,
          left: 0,
          zIndex: 1005,
          boxShadow: !collapsed && !screens.lg ? '4px 0 24px rgba(0,0,0,0.1)' : 'none',
        }}
        className={!screens.lg && !collapsed ? 'fixed-sider-mobile' : ''}
      >
        {SidebarContent}
      </Sider>

      {/* Mobile Overlay (Darken background when menu is open) */}
      {!screens.lg && !collapsed && (
        <div
          className="fixed inset-0 z-[1004] bg-black/40 animate-in fade-in"
          onClick={() => setCollapsed(true)}
        />
      )}

      <AntLayout className="min-h-screen bg-gray-50 transition-all duration-300">
        <Content style={{ margin: 0, overflow: 'initial', position: 'relative' }}>
          <div className={`max-w-400 mx-auto p-4 md:p-6 lg:p-8 ${!screens.lg ? 'pb-[8.5rem]' : ''}`}>
            {children}
          </div>
        </Content>
      </AntLayout>

      {!screens.lg ? (
        <div className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[910] border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 pt-2">
            {mobilePrimaryNavItems.map((item) => {
              const isActive = matchesNavKey(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.key)}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                isMoreActive || !collapsed
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
              aria-label="Open more navigation"
            >
              <span className="text-lg">
                <AppstoreOutlined />
              </span>
              <span>More</span>
            </button>
          </div>
        </div>
      ) : null}
    </AntLayout>
  );
};

export default Layout;
