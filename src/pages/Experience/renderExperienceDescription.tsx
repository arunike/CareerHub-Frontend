import type React from 'react';

// Plain-text descriptions with '-' bullets render as a real list; anything else stays a paragraph.
export const renderExperienceDescription = (text: string) => {
  const lines = text.split('\n');
  let inList = false;
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const isBullet =
      line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*');
    if (isBullet) {
      inList = true;
      const pureText = line.replace(/^[-•*]\s*/, '').trim();
      currentList.push(
        <li
          key={`li-${index}`}
          className="mb-2.5 pl-1 leading-relaxed text-gray-700 dark:text-ink-100 relative"
        >
          {pureText}
        </li>
      );
    } else {
      if (inList) {
        elements.push(
          <ul key={`ul-${index}`} className="list-none pl-1 mb-5 space-y-2">
            {currentList.map((item: any, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0 shadow-sm" />
                <div>{item}</div>
              </div>
            ))}
          </ul>
        );
        inList = false;
        currentList = [];
      }
      if (line.trim().length > 0) {
        elements.push(
          <div
            key={`p-${index}`}
            className="mb-4 text-gray-700 dark:text-ink-100 leading-relaxed font-medium"
          >
            {line}
          </div>
        );
      }
    }
  });

  if (inList && currentList.length > 0) {
    elements.push(
      <ul key={`ul-end`} className="list-none pl-1 mb-2 space-y-2">
        {currentList.map((item: any, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0 shadow-sm" />
            <div>{item}</div>
          </div>
        ))}
      </ul>
    );
  }

  return elements;
};
