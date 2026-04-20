import {
  getStoredLocalLLMSettings,
  hasConfiguredLocalLLMSettings,
  type LocalLLMSettings,
} from './llmSettings';

type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  settings?: LocalLLMSettings;
}

export class LLMConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMConfigurationError';
  }
}

export class LLMRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMRequestError';
  }
}

const stripCodeFences = (value: string) =>
  value.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

const extractErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return 'The provider returned an unknown error.';

  const maybeError = (payload as { error?: unknown }).error;
  if (typeof maybeError === 'string') return maybeError;
  if (maybeError && typeof maybeError === 'object') {
    const message = (maybeError as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  return 'The provider returned an unknown error.';
};

export const isLLMConfigurationError = (error: unknown): error is LLMConfigurationError =>
  error instanceof LLMConfigurationError;

export const requestChatCompletion = async ({
  messages,
  temperature = 0.2,
  settings = getStoredLocalLLMSettings(),
}: ChatCompletionOptions): Promise<string> => {
  if (!hasConfiguredLocalLLMSettings(settings)) {
    throw new LLMConfigurationError(
      'AI provider is not configured. Add your endpoint, model, and API key in Settings > General > AI Provider.'
    );
  }

  const response = await fetch(settings.endpoint.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages,
      temperature,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new LLMRequestError(`Provider request failed with status ${response.status}.`);
    }
    throw new LLMRequestError('Provider returned a non-JSON response.');
  }

  if (!response.ok) {
    throw new LLMRequestError(extractErrorMessage(payload));
  }

  const content = (payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
  }).choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new LLMRequestError('Provider returned an empty completion.');
  }

  return stripCodeFences(content);
};

export const requestJsonCompletion = async <T,>(options: ChatCompletionOptions): Promise<T> => {
  const content = await requestChatCompletion(options);

  try {
    return JSON.parse(content) as T;
  } catch (error) {
    console.error('Failed to parse provider JSON response', error, content);
    throw new LLMRequestError('Provider returned invalid JSON.');
  }
};
