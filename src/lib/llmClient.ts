import { AxiosError } from 'axios';

import { requestAIProviderChatCompletion } from '../api';

type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
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

export const isLLMConfigurationError = (error: unknown): error is LLMConfigurationError =>
  error instanceof LLMConfigurationError;

const extractAxiosErrorMessage = (error: AxiosError) => {
  const payload = error.response?.data as
    | { detail?: unknown; error?: unknown; message?: unknown }
    | undefined;

  if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  return '';
};

export const requestChatCompletion = async ({
  messages,
  temperature = 0.2,
}: ChatCompletionOptions): Promise<string> => {
  try {
    const response = await requestAIProviderChatCompletion({
      messages,
      temperature,
    });
    const payload: unknown = response.data;

    const content = (payload as {
      choices?: Array<{ message?: { content?: unknown } }>;
    }).choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      throw new LLMRequestError('Provider returned an empty completion.');
    }

    return stripCodeFences(content);
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = extractAxiosErrorMessage(error);
      if (error.response?.status === 400) {
        throw new LLMConfigurationError(
          message ||
            'AI provider is not configured. Add your endpoint, model, and API key in Settings > AI Provider.'
        );
      }
      throw new LLMRequestError(message || 'Provider request failed.');
    }
    if (error instanceof LLMRequestError || error instanceof LLMConfigurationError) {
      throw error;
    }
    throw new LLMRequestError(
      error instanceof Error ? error.message : 'Provider request failed.'
    );
  }
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
