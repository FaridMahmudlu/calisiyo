import Image from 'next/image';

const SOURCES = {
  primary: '/brand/planliyo-logo.svg',
  white: '/brand/planliyo-logo-white.svg',
  black: '/brand/planliyo-logo-black.svg',
};

export default function BrandLogo({
  className = '',
  markOnly = false,
  variant = 'primary', // 'primary' | 'white' | 'black' | 'adaptive' (follows the dashboard theme)
  priority = false,
}) {
  const size = { width: markOnly ? 32 : 152, height: markOnly ? 32 : 40 };
  const adaptive = variant === 'adaptive' && !markOnly;
  const classes = `brand-logo ${markOnly ? 'is-mark-only' : ''} ${adaptive ? 'is-adaptive' : ''} ${className}`.replace(/\s+/g, ' ').trim();

  if (adaptive) {
    return (
      <span className={classes}>
        <Image className="brand-logo-image brand-logo-light" src={SOURCES.primary} alt="Planliyo" {...size} priority={priority} />
        <Image className="brand-logo-image brand-logo-dark" src={SOURCES.white} alt="" aria-hidden="true" {...size} priority={priority} />
      </span>
    );
  }

  return (
    <span className={classes}>
      <Image
        className="brand-logo-image"
        src={markOnly ? '/brand/planliyo-monogram.svg' : SOURCES[variant] || SOURCES.primary}
        alt="Planliyo"
        {...size}
        priority={priority}
      />
    </span>
  );
}
