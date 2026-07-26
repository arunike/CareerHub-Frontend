import React from 'react';
import clsx from 'clsx';

type CrispInfoIconProps = {
  className?: string;
  size?: number;
};

export const CrispInfoIcon: React.FC<CrispInfoIconProps> = ({
  className = 'w-3.5 h-3.5',
  size = 14,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={clsx('inline-block shrink-0 align-middle', className)}
    style={{ shapeRendering: 'geometricPrecision' }}
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 7.25V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="4.75" r="1.1" fill="currentColor" />
  </svg>
);

export default CrispInfoIcon;
