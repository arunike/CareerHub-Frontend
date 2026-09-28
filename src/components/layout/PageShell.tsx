import type { ComponentProps, ReactNode } from 'react';

import PageActionToolbar from '../actions/PageActionToolbar';

type ToolbarProps = ComponentProps<typeof PageActionToolbar>;

// Layout already centres every page at max-w-[1560px]; a page that caps itself again is the bug.
const WIDTH = {
  full: '',
  // Long-form reading, opted into by name so the exception is visible rather than an ad-hoc value.
  reading: 'mx-auto w-full max-w-3xl',
};

export interface PageShellProps extends ToolbarProps {
  children?: ReactNode;
  width?: keyof typeof WIDTH;
  // A section picker that belongs over the title rather than under it.
  above?: ReactNode;
}

// One owner of page chrome: the header, the width and the vertical rhythm every page shares.
const PageShell = ({ children, width = 'full', above, ...toolbar }: PageShellProps) => (
  <div className={`space-y-6 ${WIDTH[width]}`.trim()}>
    {above}
    <PageActionToolbar {...toolbar} />
    {children}
  </div>
);

export default PageShell;
