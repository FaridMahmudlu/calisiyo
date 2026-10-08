import { Image } from 'expo-image';
import { View } from 'react-native';

// Same sprite atlases as the web classroom: 4 columns x 2 rows, 8 facing directions.
export const AVATAR_MODELS = {
  navy: { label: 'Deniz', description: 'Lacivert kapüşonlu, enerjik ve sakin', src: require('../../../assets/classroom/student-navy-v1.webp'), ratio: 2 },
  sage: { label: 'Ada', description: 'Adaçayı tonları, sıcak ve dengeli', src: require('../../../assets/classroom/student-sage-v1.webp'), ratio: 1.5 },
  rust: { label: 'Emir', description: 'Kiremit sweatshirt, meraklı ve düzenli', src: require('../../../assets/classroom/student-rust-v1.webp'), ratio: 1 },
  ece: { label: 'Ece', description: 'Krem kazak, yeşil tonlar ve sıcak bir ifade', src: require('../../../assets/classroom/student-ece-v1.webp'), ratio: 1.5 },
  selin: { label: 'Selin', description: 'Lila ceket, modern ve kendinden emin', src: require('../../../assets/classroom/student-selin-v1.webp'), ratio: 1.5 },
  arda: { label: 'Arda', description: 'Mavi gömlek, sportif ve odaklı', src: require('../../../assets/classroom/student-arda-v1.webp'), ratio: 1.5 },
} as const;
export type AvatarModel = keyof typeof AVATAR_MODELS;
export const FACINGS = ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'] as const;
export type Facing = typeof FACINGS[number];

const FRAME: Record<string, [number, number]> = {
  south: [0, 0], south_west: [1, 0], west: [2, 0], north_west: [3, 0],
  north: [0, 1], north_east: [1, 1], east: [2, 1], south_east: [3, 1],
};

export function ClassroomAvatar({ model, size = 80, facing = 'south', name }: { model?: string | null; size?: number; facing?: string | null; name?: string }) {
  const key = (model && model in AVATAR_MODELS ? model : 'navy') as AvatarModel;
  const sprite = AVATAR_MODELS[key];
  const [column, row] = FRAME[facing || 'south'] || FRAME.south;
  const sheetHeight = size * 2;
  const sheetWidth = sheetHeight * sprite.ratio;
  const frameWidth = sheetWidth / 4;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }} accessibilityRole="image" accessibilityLabel={`${name || 'Öğrenci'} karakteri, ${sprite.label} görünümü`}>
      <View style={{ width: frameWidth, height: size, overflow: 'hidden' }}>
        <Image source={sprite.src} style={{ position: 'absolute', width: sheetWidth, height: sheetHeight, left: -(column * frameWidth), top: -(row * size) }} contentFit="fill" />
      </View>
    </View>
  );
}
