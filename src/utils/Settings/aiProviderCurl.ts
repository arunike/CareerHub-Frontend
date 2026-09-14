import type { AIProviderSettings } from '../../lib/llmSettings';

export const unquoteShellValue = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const parseAIProviderCurl = (curlText: string) => {
  const normalized = curlText
    .replace(/\\\s*\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const urlMatch = normalized.match(/curl\s+(?:-[A-Za-z]\s+\S+\s+)*(['"]?)(https?:\/\/[^\s'"]+)\1/);
  const authMatch = normalized.match(/authorization:\s*bearer\s+([^'"\s]+)/i);
  const dataMatch = normalized.match(/(?:--data(?:-raw)?|-d)\s+('(?:\\'|[^'])*'|"(?:\\"|[^"])*")/i);

  let model = '';
  if (dataMatch?.[1]) {
    try {
      const payload = JSON.parse(unquoteShellValue(dataMatch[1]));
      if (typeof payload.model === 'string') model = payload.model;
    } catch {
      // A body we cannot parse still leaves the endpoint and key usable.
    }
  }

  return {
    endpoint: urlMatch?.[2] || '',
    // A shell variable is a placeholder, not the key itself.
    apiKey: authMatch?.[1]?.startsWith('$') ? '' : authMatch?.[1] || '',
    model,
  };
};

export const maskedProviderKey = (settings: AIProviderSettings) => {
  const key = settings.apiKey.trim();
  if (key) return key.length <= 4 ? '•'.repeat(key.length) : `••••••••${key.slice(-4)}`;
  if (settings.apiKeyConfigured) return settings.apiKeyMasked || '<stored encrypted key>';
  return '<provider key>';
};

export const chatMessagesPreview = '[{"role":"user","content":"Hello"}]';

export const buildAIProviderCurlPreview = (settings: AIProviderSettings) => {
  const endpoint = settings.endpoint.trim() || '<endpoint>';
  const model = settings.model.trim() || '<model>';
  const key = maskedProviderKey(settings);

  if (settings.adapter === 'gemini') {
    const url = endpoint.endsWith(':generateContent')
      ? endpoint
      : `${endpoint.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`;
    return `curl '${url}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-goog-api-key: ${key}' \\
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}],"generationConfig":{"temperature":0.2}}'`;
  }

  if (settings.adapter === 'claude') {
    const url = endpoint.endsWith('/v1/messages')
      ? endpoint
      : endpoint.endsWith('/v1')
        ? `${endpoint}/messages`
        : `${endpoint.replace(/\/$/, '')}/v1/messages`;
    return `curl '${url}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${key}' \\
  -H 'anthropic-version: 2023-06-01' \\
  -d '{"model":"${model}","max_tokens":4096,"messages":${chatMessagesPreview},"temperature":0.2}'`;
  }

  const openRouterHeaders =
    settings.adapter === 'openrouter'
      ? ` \\
  -H 'HTTP-Referer: https://careerhub.local' \\
  -H 'X-OpenRouter-Title: CareerHub'`
      : '';

  return `curl '${endpoint}' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json'${openRouterHeaders} \\
  -d '{"model":"${model}","messages":${chatMessagesPreview},"temperature":0.2}'`;
};
