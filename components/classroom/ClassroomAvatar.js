'use client';

const SPRITE_MODELS = {
  navy: {
    label: 'Deniz',
    description: 'Lacivert kapüşonlu, enerjik ve sakin',
    src: '/assets/classroom/sprites/student-navy-v1.webp',
    ratio: 2,
  },
  sage: {
    label: 'Ada',
    description: 'Adaçayı tonları, sıcak ve dengeli',
    src: '/assets/classroom/sprites/student-sage-v1.webp',
    ratio: 1.5,
  },
  rust: {
    label: 'Emir',
    description: 'Kiremit sweatshirt, meraklı ve düzenli',
    src: '/assets/classroom/sprites/student-rust-v1.webp',
    ratio: 1,
  },
  ece: {
    label: 'Ece',
    description: 'Krem kazak, yeşil tonlar ve sıcak bir ifade',
    src: '/assets/classroom/sprites/student-ece-v1.webp',
    ratio: 1.5,
  },
  selin: {
    label: 'Selin',
    description: 'Lila ceket, modern ve kendinden emin',
    src: '/assets/classroom/sprites/student-selin-v1.webp',
    ratio: 1.5,
  },
  arda: {
    label: 'Arda',
    description: 'Mavi gömlek, sportif ve odaklı',
    src: '/assets/classroom/sprites/student-arda-v1.webp',
    ratio: 1.5,
  },
};

const DIRECTION_FRAME = {
  south: [0, 0], south_west: [1, 0], west: [2, 0], north_west: [3, 0],
  north: [0, 1], north_east: [1, 1], east: [2, 1], south_east: [3, 1],
};

export const AVATAR_MODELS = SPRITE_MODELS;
export const DEFAULT_AVATAR = { model: 'navy' };

export default function ClassroomAvatar({ avatar, name, size = 80, facing = 'south', moving = false, className = '' }) {
  const modelKey = SPRITE_MODELS[avatar?.model] ? avatar.model : 'navy';
  const model = SPRITE_MODELS[modelKey];
  const [column, row] = DIRECTION_FRAME[facing] || DIRECTION_FRAME.south;
  const sheetHeight = size * 2;
  const sheetWidth = sheetHeight * model.ratio;
  const frameWidth = sheetWidth / 4;

  return (
    <span
      className={`classroom-sprite sprite-${modelKey} ${moving ? 'is-moving' : ''} ${className}`}
      role="img"
      aria-label={`${name || 'Öğrenci'} karakteri, ${model.label} görünümü`}
      style={{ width: size, height: size }}
    >
      <span className="classroom-sprite-frame" style={{ width: frameWidth, height: size }}>
        {/* Generated project asset; the clipped atlas frame changes with movement direction. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={model.src}
          alt=""
          draggable="false"
          width={Math.round(sheetWidth)}
          height={Math.round(sheetHeight)}
          style={{
            width: sheetWidth,
            height: sheetHeight,
            left: -(column * frameWidth),
            top: -(row * size),
          }}
        />
      </span>
    </span>
  );
}
