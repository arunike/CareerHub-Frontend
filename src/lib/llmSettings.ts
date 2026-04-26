import type { UserSettings } from '../types';

export interface AIProviderSettings {
  adapter: 'claude' | 'gemini' | 'openai' | 'openrouter';
  endpoint: string;
  model: string;
  apiKey: string;
  apiKeyConfigured: boolean;
  apiKeyMasked: string;
}

export const DEFAULT_AI_PROVIDER_SETTINGS: AIProviderSettings = {
  adapter: 'gemini',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-3-flash-preview',
  apiKey: '',
  apiKeyConfigured: false,
  apiKeyMasked: '',
};

const normalizeAIProviderAdapter = (
  adapter?: string
): AIProviderSettings['adapter'] => {
  if (adapter === 'google_gemini') return 'gemini';
  if (adapter === 'openai_compatible') return 'openai';
  if (adapter === 'claude' || adapter === 'gemini' || adapter === 'openai' || adapter === 'openrouter') {
    return adapter;
  }
  return DEFAULT_AI_PROVIDER_SETTINGS.adapter;
};

export const getAIProviderSettingsFromUserSettings = (
  settings?: Partial<UserSettings> | null
): AIProviderSettings => {
  if (!settings) {
    return { ...DEFAULT_AI_PROVIDER_SETTINGS };
  }

  return {
    adapter: normalizeAIProviderAdapter(settings.ai_provider_adapter),
    endpoint: settings.ai_provider_endpoint?.trim() || DEFAULT_AI_PROVIDER_SETTINGS.endpoint,
    model: settings.ai_provider_model?.trim() || DEFAULT_AI_PROVIDER_SETTINGS.model,
    apiKey: '',
    apiKeyConfigured: Boolean(settings.ai_provider_api_key_configured),
    apiKeyMasked: settings.ai_provider_api_key_masked?.trim() || '',
  };
};

export const buildAIProviderSettingsPatch = (
  settings: AIProviderSettings,
  includeApiKey: boolean
): Partial<UserSettings> => {
  const patch: Partial<UserSettings> = {
    ai_provider_adapter: settings.adapter,
    ai_provider_endpoint: settings.endpoint.trim(),
    ai_provider_model: settings.model.trim(),
  };

  if (includeApiKey) {
    patch.ai_provider_api_key = settings.apiKey;
  }

  return patch;
};

export const hasConfiguredAIProviderSettings = (
  settings: AIProviderSettings = DEFAULT_AI_PROVIDER_SETTINGS
) =>
  Boolean(
    settings.endpoint.trim() &&
      settings.model.trim() &&
      (settings.apiKey.trim() || settings.apiKeyConfigured)
  );
