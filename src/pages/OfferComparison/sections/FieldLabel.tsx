import type { ReactNode } from 'react';
import HelpTooltipTrigger from '../../../components/HelpTooltipTrigger';

type FieldLabelProps = {
  children: string;
  className?: string;
  help?: ReactNode;
  htmlFor?: string;
};

// A label plus optional help, kept together so every field explains itself the same way. The
const FieldLabel = ({ children, className, help, htmlFor }: FieldLabelProps) => (
  <span className="flex items-center gap-1">
    <label className={className} htmlFor={htmlFor}>
      {children}
    </label>
    {help && <HelpTooltipTrigger title={help} ariaLabel={`What does ${children} mean?`} />}
  </span>
);

export default FieldLabel;
