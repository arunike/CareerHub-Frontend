import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Grid, ConfigProvider } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  LineChartOutlined,
  SettingOutlined,
  SolutionOutlined,
  DollarOutlined,
  MenuOutlined,
  CloseOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  TrophyOutlined,
  RobotOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import IdentityAvatar from './IdentityAvatar';
import NotificationBell from './NotificationBell';
import logoWithText from '../assets/logo_with_text.png';
import { getUserSettings } from '../api/availability';
import { useAuth } from '../context/AuthContext';

const { Sider, Content } = AntLayout;
const { useBreakpoint } = Grid;

const Layout = ({ children }: { children: React.ReactNode }) => {
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>([]);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  const activeKey = location.pathname + location.search;
  const intelligencePaths = ['/jd-reports', '/ai-tools', '/cover-letters'];
  const isIntelligence = intelligencePaths.some((p) => location.pathname.startsWith(p));
  const selectedKey =
    location.pathname === '/cover-letters' || activeKey === '/ai-tools'
      ? '/ai-tools?tab=cover-letters'
      : activeKey;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-gray-50">
        <img src={logoWithText} alt="CareerHub" className="h-24" />
        {!screens.lg && (
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
            items={visibleMenuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
            className="border-none bg-transparent"
          />
        </ConfigProvider>
      </div>

      <div className="p-4 border-t border-gray-100">
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
        collapsed={screens.lg ? false : collapsed}
        trigger={null}
        collapsedWidth={0}
        style={{
          height: '100vh',
          position: screens.lg ? 'sticky' : 'fixed',
          top: 0,
          left: 0,
          zIndex: 1000,
          boxShadow: !collapsed && !screens.lg ? '4px 0 24px rgba(0,0,0,0.1)' : 'none',
        }}
        className={!screens.lg && !collapsed ? 'fixed-sider-mobile' : ''}
      >
        {SidebarContent}
      </Sider>

      {/* Mobile Overlay (Darken background when menu is open) */}
      {!screens.lg && !collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-999 animate-in fade-in"
          onClick={() => setCollapsed(true)}
        />
      )}

      <AntLayout className="min-h-screen bg-gray-50 transition-all duration-300">
        <Content style={{ margin: 0, overflow: 'initial', position: 'relative' }}>
          {!screens.lg && (
            <div className="fixed top-4 left-4 z-900">
              <Button
                type="default"
                icon={<MenuOutlined />}
                onClick={() => setCollapsed(false)}
                className="shadow-md border-gray-200 bg-white/90 backdrop-blur"
                size="large"
              />
            </div>
          )}

          <div className={`p-4 md:p-6 lg:p-8 max-w-400 mx-auto ${!screens.lg ? 'pt-20' : ''}`}>
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
