import { useCallback, useState } from 'react';
import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { updateUserSettings } from '../../api/availability';
import type { UserSettings } from '../../types';
import { parseAIProviderCurl } from './aiProviderCurl';
import {
  buildAIProviderSettingsPatch,
  getAIProviderSettingsFromUserSettings,
  type AIProviderSettings,
} from '../../lib/llmSettings';

export const useAiProviderSettings = ({
  setSettings,
  originalSettingsRef,
  messageApi,
}: {
  settings: UserSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  originalSettingsRef: React.MutableRefObject<string>;
  messageApi: MessageInstance;
}) => {
  const [aiSettings, setAiSettings] = useState<AIProviderSettings>(() =>
    getAIProviderSettingsFromUserSettings(null)
  );
  const [savedAiSettings, setSavedAiSettings] = useState<AIProviderSettings>(() =>
    getAIProviderSettingsFromUserSettings(null)
  );
  const [aiApiKeyChanged, setAiApiKeyChanged] = useState(false);
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [aiProviderCurl, setAiProviderCurl] = useState('');

  const syncAiSettings = useCallback((nextSettings: Partial<UserSettings> | null | undefined) => {
    const normalized = getAIProviderSettingsFromUserSettings(nextSettings);
    setAiSettings(normalized);
    setSavedAiSettings(normalized);
    setAiApiKeyChanged(false);
    setShowAiApiKey(false);
  }, []);

  const aiSettingsDirty =
    aiSettings.adapter !== savedAiSettings.adapter ||
    aiSettings.endpoint.trim() !== savedAiSettings.endpoint.trim() ||
    aiSettings.model.trim() !== savedAiSettings.model.trim() ||
    aiApiKeyChanged;

  const mergeAiSettingsIntoSettings = (nextAiSettings: Partial<UserSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...nextAiSettings } : prev));
  };

  const mergeAiSettingsIntoOriginalRef = (nextAiSettings: Partial<UserSettings>) => {
    if (!originalSettingsRef.current) return;
    try {
      const parsed = JSON.parse(originalSettingsRef.current) as UserSettings;
      originalSettingsRef.current = JSON.stringify({ ...parsed, ...nextAiSettings });
    } catch (error) {
      console.error('Failed to sync AI settings snapshot', error);
    }
  };

  const updateAiSetting = (field: keyof AIProviderSettings, value: string) => {
    if (field === 'apiKey') {
      setAiApiKeyChanged(true);
    }
    setAiSettings((prev) => ({ ...prev, [field]: value }));
  };

  const applyAiProviderPreset = (adapter: AIProviderSettings['adapter']) => {
    const presets: Record<AIProviderSettings['adapter'], { endpoint: string; model: string }> = {
      claude: {
        endpoint: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
      gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-3-flash-preview',
      },
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
      },
      openrouter: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'openai/gpt-5.2',
      },
      custom: {
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-medium-latest',
      },
    };
    const preset = presets[adapter];
    setAiSettings((prev) => ({
      ...prev,
      adapter,
      endpoint: preset.endpoint,
      model: preset.model,
    }));
  };

  const applyParsedAiProviderCurl = (curlText: string, successMessage?: string) => {
    const parsed = parseAIProviderCurl(curlText);
    if (!parsed.endpoint && !parsed.model && !parsed.apiKey) {
      return false;
    }
    setAiSettings((prev) => ({
      ...prev,
      adapter: 'custom',
      endpoint: parsed.endpoint || prev.endpoint,
      model: parsed.model || prev.model,
      apiKey: parsed.apiKey || prev.apiKey,
    }));
    if (parsed.apiKey) {
      setAiApiKeyChanged(true);
    }
    if (successMessage) {
      messageApi.success(successMessage);
    }
    return true;
  };

  const handleApplyAiProviderCurl = () => {
    const applied = applyParsedAiProviderCurl(aiProviderCurl, 'Curl parsed into a custom provider');
    if (!applied) {
      messageApi.error('Could not parse endpoint, model, or Bearer key from that curl command');
    }
  };

  const handleAiProviderCurlPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    if (!pastedText.trim()) return;
    window.setTimeout(() => {
      applyParsedAiProviderCurl(pastedText, 'Curl pasted and fields filled');
    }, 0);
  };

  const handleSaveAiSettings = async () => {
    try {
      const response = await updateUserSettings(
        buildAIProviderSettingsPatch(aiSettings, aiApiKeyChanged)
      );
      const nextSettings = response.data as UserSettings;
      mergeAiSettingsIntoSettings({
        ai_provider_adapter: nextSettings.ai_provider_adapter,
        ai_provider_endpoint: nextSettings.ai_provider_endpoint,
        ai_provider_model: nextSettings.ai_provider_model,
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      mergeAiSettingsIntoOriginalRef({
        ai_provider_adapter: nextSettings.ai_provider_adapter,
        ai_provider_endpoint: nextSettings.ai_provider_endpoint,
        ai_provider_model: nextSettings.ai_provider_model,
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      syncAiSettings(nextSettings);
      messageApi.success(
        nextSettings.ai_provider_api_key_configured
          ? 'AI provider saved with an encrypted server-side key.'
          : 'AI provider preset saved. Add an API key to enable AI features.'
      );
    } catch (error) {
      messageApi.error('Failed to save AI provider');
      console.error('Error saving AI provider:', error);
    }
  };

  const handleClearAiSettings = async () => {
    try {
      const response = await updateUserSettings({ ai_provider_api_key: '' });
      const nextSettings = response.data as UserSettings;
      mergeAiSettingsIntoSettings({
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      mergeAiSettingsIntoOriginalRef({
        ai_provider_api_key_configured: nextSettings.ai_provider_api_key_configured,
        ai_provider_api_key_masked: nextSettings.ai_provider_api_key_masked,
        updated_at: nextSettings.updated_at,
      });
      syncAiSettings(nextSettings);
      messageApi.success('Stored AI key cleared from the server.');
    } catch (error) {
      messageApi.error('Failed to clear AI key');
      console.error('Error clearing AI key:', error);
    }
  };

  return {
    aiSettings,
    savedAiSettings,
    aiApiKeyChanged,
    showAiApiKey,
    setShowAiApiKey,
    aiProviderCurl,
    setAiProviderCurl,
    aiSettingsDirty,
    syncAiSettings,
    updateAiSetting,
    applyAiProviderPreset,
    handleApplyAiProviderCurl,
    handleAiProviderCurlPaste,
    handleSaveAiSettings,
    handleClearAiSettings,
  };
};
