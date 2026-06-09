import React from 'react';

export const parseInlineMarkdown = (text?: string): React.ReactNode => {
  if (!text) return null;
  const normalized = text.replace(/[‘’]/g, "'");
  const parts = normalized.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={`${part}-${index}`} className="text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};
