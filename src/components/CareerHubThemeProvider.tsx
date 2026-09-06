import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { APP_DARK_MODE_ENABLED } from '../theme/preference';
import { useTheme } from '../theme/ThemeProvider';

// Only the surfaces that must invert; everything else is shared between the two themes.
const LIGHT_SURFACE = {
  colorBgContainer: '#ffffff',
  colorBgLayout: '#f8fafc',
  colorBgElevated: '#ffffff',
  colorBorder: '#e2e8f0',
  colorBorderSecondary: '#f1f5f9',
  colorTextBase: '#111827',
  colorTextSecondary: '#475569',
  colorTextTertiary: '#64748b',
};

const DARK_SURFACE = {
  colorBgContainer: '#111216',
  colorBgLayout: '#08090b',
  colorBgElevated: '#16181d',
  colorBorder: 'rgba(255,255,255,0.12)',
  colorBorderSecondary: 'rgba(255,255,255,0.08)',
  colorTextBase: '#f5f5f6',
  colorTextSecondary: '#c4c6cc',
  colorTextTertiary: '#8a8e97',
  colorPrimary: '#4d8dfd',
  colorLink: '#8fb6ff',
};

const CAREERHUB_THEME = {
  token: {
    colorPrimary: '#2563eb',
    colorPrimaryHover: '#1d4ed8',
    colorPrimaryActive: '#1e40af',
    colorLink: '#2563eb',
    colorLinkHover: '#1d4ed8',
    borderRadius: 9,
    borderRadiusLG: 12,
    borderRadiusSM: 5,
    fontSize: 14,
    fontSizeLG: 15,
    fontFamily: `'Aptos', 'Geist', 'Satoshi', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
    boxShadowSecondary:
      '0 18px 45px -30px rgba(15, 23, 42, 0.45), 0 4px 14px -12px rgba(15, 23, 42, 0.35)',
    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 30,
    lineHeight: 1.6,
    zIndexPopupBase: 2000,
  },
  components: {
    Button: {
      fontWeight: 650,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSplitColor: 'transparent',
      borderColor: '#f1f5f9',
      rowHoverBg: '#fafbff',
      cellPaddingBlock: 14,
      cellPaddingInline: 18,
      headerBorderRadius: 0,
      fontSize: 14,
    },
    Card: {
      paddingLG: 22,
      boxShadowTertiary: 'none',
    },
    Input: {
      activeShadow: '0 0 0 3px rgba(49,88,183,0.14)',
      paddingInline: 14,
    },
    Select: {
      optionSelectedBg: '#eff6ff',
      optionActiveBg: '#f8fafc',
    },
    Menu: {
      activeBarBorderWidth: 0,
      itemSelectedBg: '#eff6ff',
      itemSelectedColor: '#2563eb',
      itemHoverBg: '#f8fafc',
      subMenuItemBg: '#fafafa',
      groupTitleColor: '#475569',
      groupTitleFontSize: 11,
    },
    Modal: {
      titleFontSize: 16,
      titleLineHeight: 1.5,
    },
    Tag: {
      borderRadiusSM: 20,
    },
    Tabs: {
      inkBarColor: '#2563eb',
      itemSelectedColor: '#2563eb',
      itemHoverColor: '#1d4ed8',
      titleFontSizeLG: 14,
    },
    Progress: {
      defaultColor: '#2563eb',
    },
    Badge: {
      colorPrimary: '#2563eb',
    },
    Tooltip: {
      borderRadius: 8,
      fontSize: 13,
    },
  },
};

const CareerHubThemeProvider = ({ children }: { children: ReactNode }) => {
  const { resolved } = useTheme();
  // Clamped until every page carries dark styling: antd would invert against light markup.
  const isDark = APP_DARK_MODE_ENABLED && resolved === 'dark';

  // Antd portals to body, so the flag lives on the root rather than on a wrapper.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return (
    <ConfigProvider
      theme={{
        ...CAREERHUB_THEME,
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { ...CAREERHUB_THEME.token, ...(isDark ? DARK_SURFACE : LIGHT_SURFACE) },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default CareerHubThemeProvider;
