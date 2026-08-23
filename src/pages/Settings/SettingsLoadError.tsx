import { PageState } from '../../components/PageState';

const SettingsLoadError = ({ onRetry }: { onRetry: () => void }) => (
  <PageState
    tone="error"
    title="Settings could not be loaded"
    description="No settings were changed. Check your connection and try loading them again."
    actionLabel="Retry loading settings"
    onAction={onRetry}
    className="mt-12"
  />
);

export default SettingsLoadError;
