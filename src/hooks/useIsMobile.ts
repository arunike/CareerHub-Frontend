import { useEffect, useState } from 'react';

// The md breakpoint, matching Tailwind's, so a sheet and its styles agree on what narrow means.
export const MOBILE_BREAKPOINT = 768;

// Three components each ran this effect; forgetting the listener teardown is the bug it prevents.
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
};
