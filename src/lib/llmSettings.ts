export interface LocalLLMSettings {
  endpoint: string;
  model: string;
  apiKey: string;
}

export const LOCAL_LLM_SETTINGS_STORAGE_KEY = 'careerhub_local_llm_settings_v1';

export const DEFAULT_LOCAL_LLM_SETTINGS: LocalLLMSettings = {
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  model: 'gemini-2.0-flash',
  apiKey: '',
};

export const getStoredLocalLLMSettings = (): LocalLLMSettings => {
  try {
    const raw = localStorage.getItem(LOCAL_LLM_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOCAL_LLM_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<LocalLLMSettings>;
    return {
      endpoint: parsed.endpoint?.trim() || DEFAULT_LOCAL_LLM_SETTINGS.endpoint,
      model: parsed.model?.trim() || DEFAULT_LOCAL_LLM_SETTINGS.model,
      apiKey: parsed.apiKey || '',
    };
  } catch (error) {
    console.error('Failed to read local AI provider settings', error);
    return { ...DEFAULT_LOCAL_LLM_SETTINGS };
  }
};

export const saveStoredLocalLLMSettings = (settings: LocalLLMSettings) => {
  const normalized = {
    endpoint: settings.endpoint.trim(),
    model: settings.model.trim(),
    apiKey: settings.apiKey,
  };
  localStorage.setItem(LOCAL_LLM_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('llm-settings-saved', { detail: normalized }));
};

export const clearStoredLocalLLMSettings = () => {
  const cleared = { ...DEFAULT_LOCAL_LLM_SETTINGS, apiKey: '' };
  localStorage.setItem(LOCAL_LLM_SETTINGS_STORAGE_KEY, JSON.stringify(cleared));
  window.dispatchEvent(new CustomEvent('llm-settings-saved', { detail: cleared }));
};

export const hasConfiguredLocalLLMSettings = (settings: LocalLLMSettings = getStoredLocalLLMSettings()) =>
  Boolean(settings.endpoint.trim() && settings.model.trim() && settings.apiKey.trim());
