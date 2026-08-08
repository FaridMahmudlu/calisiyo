import Image from 'next/image';

export default function BrandLogo({
  className = '',
  markOnly = false,
  variant = 'primary', // 'primary' | 'white' | 'black'
  priority = false,
}) {
  const getLogoSrc = () => {
    if (markOnly) {
      return '/brand/calisiyo-monogram.svg';
    }
    switch (variant) {
      case 'white':
        return '/brand/calisiyo-logo-white.svg';
      case 'black':
        return '/brand/calisiyo-logo-black.svg';
      default:
        return '/brand/calisiyo-logo.svg';
    }
  };

  return (
    <span className={`calisiyo-logo ${markOnly ? 'is-mark-only' : ''} ${className}`.trim()}>
      <Image
        className="calisiyo-logo-image"
        src={getLogoSrc()}
        alt="calisiyo logo"
        width={markOnly ? 32 : 140}
        height={markOnly ? 32 : 35}
        priority={priority}
      />
    </span>
  );
}
