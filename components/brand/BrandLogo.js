import Image from 'next/image';

export default function BrandLogo({
  className = '',
  markOnly = false,
  variant = 'primary', // 'primary' | 'white' | 'black'
  priority = false,
}) {
  const getLogoSrc = () => {
    if (markOnly) {
      return '/brand/planliyo-monogram.svg';
    }
    switch (variant) {
      case 'white':
        return '/brand/planliyo-logo-white.svg';
      case 'black':
        return '/brand/planliyo-logo-black.svg';
      default:
        return '/brand/planliyo-logo.svg';
    }
  };

  return (
    <span className={`brand-logo ${markOnly ? 'is-mark-only' : ''} ${className}`.trim()}>
      <Image
        className="brand-logo-image"
        src={getLogoSrc()}
        alt="Planliyo"
        width={markOnly ? 32 : 152}
        height={markOnly ? 32 : 40}
        priority={priority}
      />
    </span>
  );
}
