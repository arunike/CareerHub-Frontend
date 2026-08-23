import { Button } from 'antd';
import type { GoogleOAuthStatus } from '../../types';

type Props = {
  connectGoogle: () => void;
  disconnectGoogle: () => void;
  googleBusy: boolean;
  googleStatus: GoogleOAuthStatus | null;
};

const GoogleConnectionBanner = ({
  connectGoogle,
  disconnectGoogle,
  googleBusy,
  googleStatus,
}: Props) => (
  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
    <div>
      <div className="text-sm font-semibold text-gray-900">Private Google Sheets Access</div>
      <div className="text-xs text-gray-600 mt-0.5">
        {googleStatus?.connected
          ? googleStatus.can_list_spreadsheets
            ? `Connected as ${googleStatus.email || 'Google account'} with read-only Sheets access.`
            : `Connected as ${googleStatus.email || 'Google account'}. Reconnect once to enable sheet selection.`
          : googleStatus?.configured
            ? 'Connect Google to read private sheets without making them public.'
            : 'Google OAuth is not configured on the backend yet.'}
      </div>
    </div>
    {googleStatus?.connected ? (
      <div className="flex flex-wrap gap-2">
        {!googleStatus.can_list_spreadsheets && (
          <Button type="primary" loading={googleBusy} onClick={connectGoogle}>
            Reconnect Google
          </Button>
        )}
        <Button loading={googleBusy} onClick={disconnectGoogle}>
          Disconnect
        </Button>
      </div>
    ) : (
      <Button
        type="primary"
        loading={googleBusy}
        disabled={!googleStatus?.configured}
        onClick={connectGoogle}
      >
        Connect Google
      </Button>
    )}
  </div>
);

export default GoogleConnectionBanner;
