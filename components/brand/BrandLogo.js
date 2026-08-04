import Image from 'next/image';

export default function BrandLogo({ className = '', markOnly = false, priority = false }) {
  return (
    <span className={`calisiyo-logo ${markOnly ? 'is-mark-only' : ''} ${className}`.trim()}>
      <span className="calisiyo-logo-mark" aria-hidden="true">
        <Image
          className="calisiyo-logo-mark-image"
          src="/brand/calisiyo-mark.svg"
          alt=""
          width={96}
          height={96}
          priority={priority}
        />
      </span>
      {!markOnly && <span className="calisiyo-logo-wordmark">calisiyo</span>}
    </span>
  );
}
