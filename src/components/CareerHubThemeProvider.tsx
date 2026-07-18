import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';

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
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8fafc',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    colorTextBase: '#111827',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748b',
    boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
    boxShadowSecondary:
      '0 18px 45px -30px rgba(15, 23, 42, 0.45), 0 4px 14px -12px rgba(15, 23, 42, 0.35)',
    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 30,
    lineHeight: 1.6,
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

const CareerHubThemeProvider = ({ children }: { children: ReactNode }) => (
  <ConfigProvider theme={CAREERHUB_THEME}>{children}</ConfigProvider>
);

export default CareerHubThemeProvider;
