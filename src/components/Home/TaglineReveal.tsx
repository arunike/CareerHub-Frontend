import { useEffect, useRef, useState } from 'react';

const LINES = [
  'A spreadsheet holds what you type.',
  'CareerHub does the arithmetic,',
  'and redoes it when a date changes.',
];

// Half a viewport up, so a word lights as it passes the reader rather than on entry.
const WORD_TRIGGER_MARGIN = '0px 0px -50% 0px';

const words = LINES.map((line, lineIndex) =>
  line.split(' ').map((word, wordIndex) => ({ word, key: `${lineIndex}-${wordIndex}` }))
);

const totalWords = words.reduce((count, line) => count + line.length, 0);

export default function TaglineReveal() {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const [activeKeys, setActiveKeys] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setActiveKeys(new Set(words.flat().map((entry) => entry.key)));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const arrived = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => (entry.target as HTMLElement).dataset.wordKey)
          .filter((key): key is string => Boolean(key));
        if (arrived.length === 0) return;
        setActiveKeys((current) => new Set([...current, ...arrived]));
      },
      { rootMargin: WORD_TRIGGER_MARGIN }
    );

    container.querySelectorAll<HTMLElement>('[data-word-key]').forEach((node) => {
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <p
          ref={containerRef}
          className="max-w-[680px] text-4xl font-semibold leading-tight tracking-[-0.03em] text-slate-950 dark:text-ink-50"
          data-active-words={activeKeys.size}
          data-total-words={totalWords}
        >
          {words.map((line, lineIndex) => (
            <span key={LINES[lineIndex]} className="block">
              {line.map((entry, wordIndex) => (
                <span key={entry.key}>
                  <span
                    className="public-tagline-word inline-block"
                    data-word-key={entry.key}
                    data-active={activeKeys.has(entry.key)}
                  >
                    {entry.word}
                  </span>
                  {wordIndex < line.length - 1 ? ' ' : null}
                </span>
              ))}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
