import { useEffect, useRef, useState } from 'react';

const REVEAL_ROOT_MARGIN = '0px 0px -10% 0px';

// Spread onto the element that carries the `public-reveal` class.
export default function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: REVEAL_ROOT_MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, 'data-revealed': revealed } as const;
}
