import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Typography, message } from 'antd';
import { CloseOutlined, MessageOutlined, SendOutlined } from '@ant-design/icons';
import {
  answerPromotionReviewFollowUp,
  type PromotionReviewChatMessage,
} from '../../lib/browserAi';
import {
  updatePromotionReviewChatMessages,
  type StoredPromotionReview,
} from '../../utils/aiArtifactStorage';
import { parseInlineMarkdown } from '../../utils/simpleMarkdown';

const { Text } = Typography;
const { TextArea } = Input;

const quickPrompts = [
  'What should I ask my manager next?',
  'How can I make the promotion case stronger?',
  'Rewrite my manager message more directly.',
];

const thinkingSteps = [
  'Reading the saved review',
  'Checking evidence gaps',
  'Drafting a useful next step',
];

const tableSeparatorPattern = /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;

const stripMarkdownPrefix = (line: string) => line.replace(/^#{1,6}\s+/, '').trim();

const isTableLine = (line: string) => line.trim().startsWith('|') && line.trim().endsWith('|');

const parseTableRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const renderInline = (text: string) => parseInlineMarkdown(text.replace(/^"|"$/g, ''));

const renderAssistantContent = (content: string) => {
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (/^-{3,}$/.test(line)) {
      blocks.push(<hr key={`hr-${index}`} className="my-3 border-slate-200" />);
      index += 1;
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      blocks.push(
        <h4
          key={`heading-${index}`}
          className="mb-2 mt-4 text-sm font-bold text-slate-950 first:mt-0"
        >
          {renderInline(stripMarkdownPrefix(line))}
        </h4>
      );
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const rows = tableLines.filter((row) => !tableSeparatorPattern.test(row));
      const [header, ...body] = rows.map(parseTableRow);
      if (header?.length) {
        blocks.push(
          <div
            key={`table-${index}`}
            className="my-3 overflow-x-auto rounded-xl border border-slate-200"
          >
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  {header.map((cell, cellIndex) => (
                    <th
                      key={`${cell}-${cellIndex}`}
                      className="border-b border-slate-200 px-3 py-2 font-semibold"
                    >
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {body.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${cell}-${cellIndex}`}
                        className="px-3 py-2 align-top text-slate-600"
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (line.startsWith('>')) {
      const quotes: string[] = [];
      while (index < lines.length && lines[index].startsWith('>')) {
        quotes.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="my-3 border-l-2 border-blue-500 bg-blue-50/60 px-3 py-2 text-sm font-medium leading-6 text-slate-800"
        >
          {quotes.map((quote, quoteIndex) => (
            <p key={`${quote}-${quoteIndex}`} className="m-0">
              {renderInline(quote)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const bullets: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        bullets.push(lines[index].replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="my-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {bullets.map((bullet, bulletIndex) => (
            <li key={`${bullet}-${bulletIndex}`}>{renderInline(bullet)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="my-2 list-decimal space-y-1 pl-5 text-sm leading-6">
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${index}`} className="my-2 text-sm leading-6 first:mt-0 last:mb-0">
        {renderInline(line)}
      </p>
    );
    index += 1;
  }

  return blocks;
};

const PromotionReviewChatPanel: React.FC<{
  review: StoredPromotionReview;
  onReviewUpdated?: (review: StoredPromotionReview) => void;
  variant?: 'inline' | 'floating';
}> = ({ review, onReviewUpdated, variant = 'inline' }) => {
  const [messages, setMessages] = useState<PromotionReviewChatMessage[]>(review.chatMessages || []);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(review.chatMessages || []);
  }, [review.id, review.chatMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, sending]);

  useEffect(() => {
    if (!sending) {
      setThinkingIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setThinkingIndex((current) => (current + 1) % thinkingSteps.length);
    }, 1600);

    return () => window.clearInterval(timer);
  }, [sending]);

  const persistMessages = async (nextMessages: PromotionReviewChatMessage[]) => {
    const updated = await updatePromotionReviewChatMessages(review.id, nextMessages);
    if (updated) onReviewUpdated?.(updated);
  };

  const sendQuestion = async (value = draft) => {
    const question = value.trim();
    if (!question || sending) return;

    const userMessage: PromotionReviewChatMessage = {
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);

    try {
      const answer = await answerPromotionReviewFollowUp({
        review: review.review,
        context: review.inputContext,
        messages,
        question,
      });
      const assistantMessage: PromotionReviewChatMessage = {
        role: 'assistant',
        content: answer,
        createdAt: new Date().toISOString(),
      };
      const completedMessages = [...nextMessages, assistantMessage];
      setMessages(completedMessages);
      await persistMessages(completedMessages);
    } catch (error) {
      setMessages(messages);
      messageApi.error(error instanceof Error ? error.message : 'Failed to answer follow-up');
    } finally {
      setSending(false);
    }
  };

  const chatBody = (
    <>
      <div
        className={`flex flex-col gap-2 ${
          variant === 'floating'
            ? 'mb-3 pr-9'
            : 'mb-4 md:flex-row md:items-center md:justify-between'
        }`}
      >
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            <MessageOutlined />
            Follow-up coach
          </div>
          <h3 className="m-0 text-lg font-bold tracking-tight text-slate-950">
            Ask about this promotion review
          </h3>
        </div>
        <Text className="text-sm text-slate-500">This chat is saved only on this review.</Text>
      </div>

      <div
        className={`mb-4 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 ${
          variant === 'floating' ? 'max-h-[420px] p-3.5' : 'max-h-72 p-4'
        }`}
      >
        {messages.length === 0 ? (
          <div className="py-6 text-center">
            <Text className="block text-sm font-semibold text-slate-600">
              Ask a follow-up after reading the review.
            </Text>
            <Text className="mt-1 block text-xs leading-5 text-slate-400">
              Good questions: manager wording, evidence gaps, packet edits, or next actions.
            </Text>
          </div>
        ) : (
          messages.map((item, index) => (
            <div
              key={`${item.createdAt}-${index}`}
              className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                  item.role === 'user'
                    ? 'max-w-[88%] bg-blue-600 text-white'
                    : 'max-w-full border border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}
              >
                {item.role === 'assistant'
                  ? renderAssistantContent(item.content)
                  : parseInlineMarkdown(item.content)}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
                </span>
                Thinking through this review
              </div>
              <div className="space-y-2">
                {thinkingSteps.map((step, stepIndex) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      stepIndex === thinkingIndex ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        stepIndex === thinkingIndex ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt}
              size="small"
              className="!rounded-full"
              disabled={sending}
              onClick={() => void sendQuestion(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              void sendQuestion();
            }
          }}
          rows={2}
          placeholder="Ask how to improve the packet, what to ask your manager, or how to rewrite a section..."
          className="!rounded-xl !border-slate-200 !text-sm"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          disabled={!draft.trim()}
          onClick={() => void sendQuestion()}
          className="!h-auto !rounded-xl !px-4"
        />
      </div>
    </>
  );

  if (variant === 'floating') {
    return (
      <div className="no-print fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {contextHolder}
        {open && (
          <div className="relative w-[min(calc(100vw-1.5rem),480px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.45)]">
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setOpen(false)}
              className="!absolute !right-3 !top-3 !h-8 !w-8 !rounded-full"
            />
            {chatBody}
          </div>
        )}
        <Button
          type="primary"
          icon={<MessageOutlined />}
          onClick={() => setOpen((current) => !current)}
          className="!h-14 !rounded-full !px-5 !font-bold shadow-[0_18px_44px_-18px_rgba(37,99,235,0.75)]"
        >
          {open ? 'Close coach' : messages.length ? `Coach (${messages.length})` : 'Ask coach'}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-46px_rgba(15,23,42,0.7)]">
      {contextHolder}
      {chatBody}
    </div>
  );
};

export default PromotionReviewChatPanel;
