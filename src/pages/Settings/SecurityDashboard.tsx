import React, { useEffect, useMemo, useState } from 'react';
import {
  CloudServerOutlined,
  GoogleOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, message } from 'antd';
import dayjs from 'dayjs';
import { getSecurityDashboard } from '../../api';
import type { SecurityDashboardResponse } from '../../api/auth';

type CheckStatus = 'ok' | 'warn' | 'bad';

type CheckItem = {
  label: string;
  detail: string;
  status: CheckStatus;
};

const statusStyles: Record<CheckStatus, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-700',
  bad: 'border-red-200 bg-red-50 text-red-700',
};

const statusLabel: Record<CheckStatus, string> = {
  ok: 'OK',
  warn: 'Review',
  bad: 'Fix',
};

const boolStatus = (value: boolean, goodWhenTrue = true): CheckStatus => (
  value === goodWhenTrue ? 'ok' : 'bad'
);

const formatDateTime = (value?: string | null) => (value ? dayjs(value).format('MMM D, YYYY h:mm A') : 'Never');

const SecurityDashboard: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [data, setData] = useState<SecurityDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await getSecurityDashboard();
      setData(response.data);
    } catch (error) {
      messageApi.error('Failed to load security dashboard');
      console.error('Failed to load security dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const checks = useMemo<CheckItem[]>(() => {
    if (!data) return [];
    return [
      {
        label: 'Production debug mode',
        detail: data.environment.debug ? 'DEBUG is enabled.' : 'DEBUG is disabled.',
        status: boolStatus(data.environment.debug, false),
      },
      {
        label: 'Admin panel exposure',
        detail: data.environment.admin_enabled ? 'Django admin is enabled.' : 'Django admin is disabled.',
        status: data.environment.admin_enabled ? 'warn' : 'ok',
      },
      {
        label: 'HTTPS redirect',
        detail: data.environment.secure_ssl_redirect ? 'HTTP requests redirect to HTTPS.' : 'HTTPS redirect is off.',
        status: boolStatus(data.environment.secure_ssl_redirect),
      },
      {
        label: 'Secure cookies',
        detail: data.environment.session_cookie_secure && data.environment.csrf_cookie_secure
          ? 'Session and CSRF cookies require HTTPS.'
          : 'Session or CSRF secure cookie flag is off.',
        status: data.environment.session_cookie_secure && data.environment.csrf_cookie_secure ? 'ok' : 'bad',
      },
      {
        label: 'HSTS',
        detail: data.environment.hsts_seconds > 0
          ? `Enabled for ${data.environment.hsts_seconds} seconds.`
          : 'HSTS is disabled.',
        status: data.environment.hsts_seconds > 0 ? 'ok' : 'warn',
      },
      {
        label: 'Google OAuth',
        detail: data.google.oauth_configured
          ? data.google.oauth_connected
            ? `Connected as ${data.google.connected_email || 'Google account'}.`
            : 'OAuth is configured, but this user has not connected Google.'
          : 'Google OAuth environment variables are missing.',
        status: data.google.oauth_configured ? (data.google.oauth_connected ? 'ok' : 'warn') : 'bad',
      },
      {
        label: 'Google Drive scope',
        detail: data.google.can_list_spreadsheets
          ? 'Spreadsheet picker scope is available.'
          : 'Reconnect Google if spreadsheet picker is unavailable.',
        status: data.google.can_list_spreadsheets ? 'ok' : 'warn',
      },
      {
        label: 'Google Sheet sync errors',
        detail: data.google.error_syncs > 0
          ? `${data.google.error_syncs} sync config(s) currently have errors.`
          : 'No sync configs are in an error state.',
        status: data.google.error_syncs > 0 ? 'bad' : 'ok',
      },
      {
        label: 'Vercel edge scanner denies',
        detail: data.waf.edge_scanner_denies_deployed
          ? 'Common scanner paths are denied at the edge.'
          : 'Scanner deny rules are not confirmed.',
        status: data.waf.edge_scanner_denies_deployed ? 'ok' : 'warn',
      },
      {
        label: 'Bot protection',
        detail: data.waf.bot_protection_configured
          ? 'Vercel bot protection actions have been applied.'
          : 'Vercel bot protection has not been marked configured.',
        status: data.waf.bot_protection_configured ? 'ok' : 'warn',
      },
      {
        label: 'AI bot blocking',
        detail: data.waf.ai_bots_blocked
          ? 'Known AI crawler traffic is blocked by Vercel Firewall settings.'
          : 'AI bot blocking has not been marked configured.',
        status: data.waf.ai_bots_blocked ? 'ok' : 'warn',
      },
    ];
  }, [data]);

  const score = useMemo(() => {
    if (!checks.length) return { ok: 0, warn: 0, bad: 0 };
    return checks.reduce(
      (acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }),
      { ok: 0, warn: 0, bad: 0 },
    );
  }, [checks]);

  if (loading && !data) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading security dashboard...</div>;
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        Security dashboard could not be loaded.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {contextHolder}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <SafetyCertificateOutlined className="text-sky-600" />
              <h3 className="text-lg font-semibold text-gray-900">Security Dashboard</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Deployment posture, auth limits, Google sync health, and Vercel edge protection status.
            </p>
          </div>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchDashboard}>
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="OK" value={score.ok} tone="emerald" />
          <Metric label="Review" value={score.warn} tone="amber" />
          <Metric label="Fix" value={score.bad} tone="red" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3">
          {checks.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="mt-1 text-xs leading-5 text-gray-500">{item.detail}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}>
                {statusLabel[item.status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel icon={<LockOutlined />} title="Auth & Access">
          <Info label="Public signup" value={data.environment.public_signup_enabled ? 'Enabled' : 'Disabled'} />
          <Info label="Login throttle" value={data.auth.login_rate} />
          <Info label="Signup throttle" value={data.auth.signup_rate} />
          <Info label="Refresh throttle" value={data.auth.token_refresh_rate} />
          <Info label="JWT access token" value={`${data.auth.jwt_access_minutes} min`} />
          <Info label="Refresh rotation" value={data.auth.refresh_rotation_enabled ? 'Enabled' : 'Disabled'} />
        </Panel>

        <Panel icon={<GoogleOutlined />} title="Google Sheets">
          <Info label="OAuth configured" value={data.google.oauth_configured ? 'Yes' : 'No'} />
          <Info label="OAuth connected" value={data.google.oauth_connected ? 'Yes' : 'No'} />
          <Info label="Spreadsheet picker" value={data.google.can_list_spreadsheets ? 'Ready' : 'Needs reconnect'} />
          <Info label="Sync configs" value={`${data.google.enabled_syncs} enabled / ${data.google.total_syncs} total`} />
          <Info label="Last sync" value={formatDateTime(data.google.latest_synced_at)} />
          {data.google.latest_error && <Info label="Latest error" value={data.google.latest_error} danger />}
        </Panel>

        <Panel icon={<CloudServerOutlined />} title="Deployment">
          <Info label="Environment" value={data.environment.mode} />
          <Info label="Allowed hosts" value={String(data.environment.allowed_hosts_count)} />
          <Info label="CORS origins" value={String(data.environment.cors_origins_count)} />
          <Info label="CSRF trusted origins" value={String(data.environment.csrf_trusted_origins_count)} />
          <Info label="Vercel runtime" value={data.waf.vercel_project ? 'Detected' : 'Not detected'} />
        </Panel>

        <Panel icon={<ThunderboltOutlined />} title="Edge Protection">
          <Info label="Scanner path denies" value={data.waf.edge_scanner_denies_deployed ? 'Deployed' : 'Unknown'} />
          <Info label="Bot protection" value={data.waf.bot_protection_configured ? 'Configured' : 'Unknown'} />
          <Info label="AI bot blocking" value={data.waf.ai_bots_blocked ? 'Configured' : 'Unknown'} />
          <Info label="Firewall actions file" value={data.waf.firewall_actions_file} />
        </Panel>
      </div>

      <p className="text-xs text-gray-400">Last checked {formatDateTime(data.checked_at)}.</p>
    </div>
  );
};

const Metric = ({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'red' }) => {
  const classes = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
};

const Panel = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
      <span className="text-sky-600">{icon}</span>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const Info = ({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={`max-w-[65%] text-right font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
  </div>
);

export default SecurityDashboard;
