import clsx from 'clsx';

type IdentityAvatarSize = 'sm' | 'md' | 'lg';

interface IdentityAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  alt?: string;
  size?: IdentityAvatarSize;
  className?: string;
}

const sizeClassNames: Record<IdentityAvatarSize, string> = {
  sm: 'h-10 w-10 rounded-xl p-0.5 text-sm',
  md: 'h-12 w-12 rounded-2xl p-0.5 text-base',
  lg: 'h-20 w-20 rounded-[20px] p-1 text-2xl',
};

const innerRadiusClassNames: Record<IdentityAvatarSize, string> = {
  sm: 'rounded-[10px]',
  md: 'rounded-[14px]',
  lg: 'rounded-2xl',
};

const getIdentityInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.trim() || 'U';
  const nameParts = source.includes('@') ? [] : source.split(/\s+/).filter(Boolean);
  const initials = nameParts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || source.charAt(0).toUpperCase();
};

const IdentityAvatar = ({ imageUrl, name, email, alt, size = 'md', className }: IdentityAvatarProps) => {
  const innerRadius = innerRadiusClassNames[size];

  return (
    <div
      className={clsx(
        'shrink-0 overflow-hidden border border-slate-200 bg-slate-50 transition-colors duration-200',
        sizeClassNames[size],
        className,
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt || name || email || 'Profile'}
          className={clsx('h-full w-full object-cover', innerRadius)}
        />
      ) : (
        <div className={clsx('flex h-full w-full items-center justify-center bg-slate-100', innerRadius)}>
          <span className="font-black text-slate-950">{getIdentityInitials(name, email)}</span>
        </div>
      )}
    </div>
  );
};

export default IdentityAvatar;
