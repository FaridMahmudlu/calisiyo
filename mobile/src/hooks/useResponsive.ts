import { useWindowDimensions, type ViewStyle } from 'react-native';
import { space } from '@/theme/tokens';

// Android window size classes: compact < 600dp (phones), medium 600–839dp
// (small tablets, foldables, tablets in portrait), expanded ≥ 840dp (tablets in
// landscape, large tablets).
export type WidthClass = 'compact' | 'medium' | 'expanded';

// Readable content widths. Forms stay narrow, lists regular, dashboards wide.
export const CONTENT_WIDTH = { narrow: 520, regular: 760, wide: 1180 } as const;
export type ContentWidth = keyof typeof CONTENT_WIDTH;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const widthClass: WidthClass = width >= 840 ? 'expanded' : width >= 600 ? 'medium' : 'compact';
  const gutter = widthClass === 'compact' ? space.lg : space.xxl;
  return {
    width,
    height,
    widthClass,
    gutter,
    isTablet: Math.min(width, height) >= 600,
    landscape: width > height,
    // Side-by-side columns only when each column still gets phone-like width.
    twoColumn: widthClass === 'expanded',
  };
}

// Centered, width-limited frame for scroll/list content containers.
export function useContentFrame(size: ContentWidth = 'regular', padded = true): ViewStyle {
  const { gutter } = useResponsive();
  return {
    width: '100%',
    maxWidth: CONTENT_WIDTH[size] + (padded ? gutter * 2 : 0),
    alignSelf: 'center',
    paddingHorizontal: padded ? gutter : 0,
  };
}
