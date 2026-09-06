import type { ClipboardEvent } from 'react';
import type React from 'react';
import { ApiOutlined, RobotOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { AIProviderSettings } from '../../lib/llmSettings';
import { SECTION_ICONS, SettingsSection } from './settingsChrome';
import { buildAIProviderCurlPreview } from './aiProviderCurl';

type Props = {
  aiSettings: AIProviderSettings;
  aiSettingsDirty: boolean;
  aiProviderCurl: string;
  setAiProviderCurl: (value: string) => void;
  showAiApiKey: boolean;
  setShowAiApiKey: React.Dispatch<React.SetStateAction<boolean>>;
  updateAiSetting: (field: keyof AIProviderSettings, value: string) => void;
  applyAiProviderPreset: (adapter: AIProviderSettings['adapter']) => void;
  handleApplyAiProviderCurl: () => void;
  handleAiProviderCurlPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  handleSaveAiSettings: () => void;
  handleClearAiSettings: () => void;
};

const AIProviderSection = ({
  aiSettings,
  aiSettingsDirty,
  aiProviderCurl,
  setAiProviderCurl,
  showAiApiKey,
  setShowAiApiKey,
  updateAiSetting,
  applyAiProviderPreset,
  handleApplyAiProviderCurl,
  handleAiProviderCurlPaste,
  handleSaveAiSettings,
  handleClearAiSettings,
}: Props) => (
  <SettingsSection
    id="ai-provider"
    icon={SECTION_ICONS.aiProvider}
    title="AI Provider"
    description="Your own provider powers cover letters, JD matching and custom widgets. The key is stored encrypted and never shown again after saving."
  >
    <div className="rounded-2xl border border-sky-100 dark:border-sky-500/20 bg-gradient-to-br from-sky-50 via-white dark:via-ink-900 to-sky-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
          <RobotOutlined className="text-lg" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-ink-50">
              Encrypted Server-side BYOK
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white dark:bg-ink-900 border border-sky-200 dark:border-sky-500/25 text-sky-700 dark:text-sky-300">
              Multi-provider
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-ink-200 mt-1 leading-relaxed">
            Your endpoint and model are stored with your account. Your API key is encrypted at rest
            on the backend and used only by the authenticated server-side relay.
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
            After save, the full key is not returned to the browser. You&apos;ll only see a masked
            confirmation that a key is on file.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1.5">
          Provider Adapter
        </label>
        <select
          className="w-full rounded-xl border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
          value={aiSettings.adapter}
          onChange={(e) => applyAiProviderPreset(e.target.value as AIProviderSettings['adapter'])}
        >
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="openai">OpenAI</option>
          <option value="openrouter">OpenRouter</option>
          <option value="custom">Custom</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-ink-400 mt-2">
          Use Custom for providers with an chat completions endpoint, including Mistral and other
          BYOK APIs.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1.5">
          Endpoint URL
        </label>
        <div className="relative">
          <ApiOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-ink-500" />
          <input
            type="url"
            className="w-full rounded-xl border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
            value={aiSettings.endpoint}
            onChange={(e) => updateAiSetting('endpoint', e.target.value)}
            placeholder={
              aiSettings.adapter === 'gemini'
                ? 'https://generativelanguage.googleapis.com/v1beta'
                : aiSettings.adapter === 'claude'
                  ? 'https://api.anthropic.com'
                  : aiSettings.adapter === 'openrouter'
                    ? 'https://openrouter.ai/api/v1/chat/completions'
                    : aiSettings.adapter === 'custom'
                      ? 'https://api.mistral.ai/v1/chat/completions'
                      : 'https://.../chat/completions'
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-ink-100 mb-1.5">
          Model
        </label>
        <input
          type="text"
          className="w-full rounded-xl border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
          value={aiSettings.model}
          onChange={(e) => updateAiSetting('model', e.target.value)}
          placeholder={
            aiSettings.adapter === 'gemini'
              ? 'gemini-3-flash-preview'
              : aiSettings.adapter === 'claude'
                ? 'claude-sonnet-4-20250514'
                : aiSettings.adapter === 'openrouter'
                  ? 'openai/gpt-5.2'
                  : aiSettings.adapter === 'custom'
                    ? 'mistral-medium-latest'
                    : 'gpt-4o-mini'
          }
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-ink-100">
            API Key
          </label>
          {aiSettings.apiKey && (
            <button
              type="button"
              onClick={() => setShowAiApiKey((current) => !current)}
              className="text-xs font-medium text-sky-600 dark:text-sky-300 hover:text-sky-700"
            >
              {showAiApiKey ? 'Hide key' : 'Show key'}
            </button>
          )}
        </div>
        <input
          type={showAiApiKey ? 'text' : 'password'}
          className="w-full rounded-xl border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
          value={aiSettings.apiKey}
          onChange={(e) => updateAiSetting('apiKey', e.target.value)}
          placeholder={
            aiSettings.apiKeyConfigured && aiSettings.apiKeyMasked
              ? `Stored key: ${aiSettings.apiKeyMasked}`
              : 'Paste your provider key'
          }
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-gray-500 dark:text-ink-400 mt-2">
          Used by Cover Letter generation, JD Matcher, job URL import, Negotiation Advisor, and
          Analytics custom widgets.
        </p>
        {aiSettings.apiKeyConfigured && !aiSettings.apiKey && (
          <p className="text-xs text-sky-600 dark:text-sky-300 mt-1">
            A key is already stored securely for this account:{' '}
            {aiSettings.apiKeyMasked || 'Saved key'}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-4 text-slate-700 dark:text-ink-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-ink-50">
              Request preview
            </label>
            <p className="text-xs text-slate-500 dark:text-ink-400 mt-1">
              This is the server-side request CareerHub will make from the saved adapter, endpoint,
              model, and encrypted key.
            </p>
          </div>
          <span className="rounded-full border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-ink-200">
            {aiSettings.adapter}
          </span>
        </div>
        <pre className="m-0 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-200/50 dark:bg-ink-800/50 border border-slate-200/80 dark:border-white/[0.08] p-3 font-mono text-xs leading-relaxed text-slate-800 dark:text-ink-50">
          {buildAIProviderCurlPreview(aiSettings)}
        </pre>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-ink-50">
              Import from provider curl
            </label>
            <p className="text-xs text-gray-500 dark:text-ink-400 mt-1">
              Optional shortcut. Paste a chat-completions curl command to fill endpoint, Bearer key,
              and model.
            </p>
          </div>
          <Button size="small" onClick={handleApplyAiProviderCurl}>
            Fill fields
          </Button>
        </div>
        <textarea
          className="w-full min-h-[96px] rounded-xl border border-gray-300 dark:border-white/[0.12] bg-gray-50 dark:bg-ink-900 px-3 py-2.5 font-mono text-xs text-gray-700 dark:text-ink-100 outline-none focus:ring-2 focus:ring-sky-500"
          value={aiProviderCurl}
          onChange={(e) => setAiProviderCurl(e.target.value)}
          onPaste={handleAiProviderCurlPaste}
          placeholder={`curl https://api.mistral.ai/v1/chat/completions \\
    -H "Authorization: Bearer $MISTRAL_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d '{"model":"mistral-medium-latest","messages":[{"role":"user","content":"Hello"}]}'`}
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="text-xs text-gray-500 dark:text-ink-400">
          Claude uses Messages, Gemini uses generateContent, and OpenAI/OpenRouter/Custom use chat
          completions.
        </div>
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:flex">
          <button
            type="button"
            onClick={handleClearAiSettings}
            disabled={!aiSettings.apiKeyConfigured}
            className="min-h-11 rounded-xl border border-gray-300 dark:border-white/[0.12] px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-ink-100 transition-colors hover:bg-gray-50"
          >
            Clear Stored Key
          </button>
          <button
            type="button"
            onClick={handleSaveAiSettings}
            disabled={!aiSettingsDirty}
            className="min-h-11 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Provider
          </button>
        </div>
      </div>
    </div>
  </SettingsSection>
);

export default AIProviderSection;
