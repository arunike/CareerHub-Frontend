import { LinkOutlined, StopOutlined } from '@ant-design/icons';
import type { ShareLink } from '../../../types';

type Props = {
  shareLink: ShareLink | null;
  shareDuration: number;
  onShareDurationChange: (value: number) => void;
  generatingLink: boolean;
  onGenerateShareLink: () => void;
  onCopyShareLink: () => void;
  deactivatingLink: boolean;
  onDeactivateShareLink: () => void;
  getShareLinkUrl: () => string;
};

const AvailabilityBookingCard = ({
  shareLink,
  shareDuration,
  onShareDurationChange,
  generatingLink,
  onGenerateShareLink,
  onCopyShareLink,
  deactivatingLink,
  onDeactivateShareLink,
  getShareLinkUrl,
}: Props) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <LinkOutlined className="text-gray-500" />
            <label className="block text-sm font-medium text-gray-700">Public Booking Link</label>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            People can only see and book your available slots. Event and holiday details stay private.
          </p>
          {shareLink ? (
            <>
              <input
                readOnly
                value={getShareLinkUrl()}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-2">
                Expires: {new Date(shareLink.expires_at).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No active booking link.</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:items-end">
          {!shareLink && (
            <select
              value={shareDuration}
              onChange={(e) => onShareDurationChange(Number(e.target.value))}
              className="rounded-lg border-gray-300 border px-3 py-2 text-sm bg-white"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          )}
          {!shareLink ? (
            <button
              onClick={onGenerateShareLink}
              disabled={generatingLink}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-70"
            >
              {generatingLink ? 'Generating...' : 'Generate Link'}
            </button>
          ) : (
            <>
              <button
                onClick={onCopyShareLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                Copy Link
              </button>
              <button
                onClick={onDeactivateShareLink}
                disabled={deactivatingLink}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <StopOutlined />
                {deactivatingLink ? 'Deactivating...' : 'Deactivate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityBookingCard;
