import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

function useWidth(initial = 300) {
  const [width, setWidth] = useState(initial);
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.max(120, event.nativeEvent.layout.width));
  return { width, onLayout };
}

const niceMax = (value: number) => {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
};

export type SeriesPoint = { label: string; value: number };

export function AreaChart({ data, height = 200, color, suffix = '', formatValue }: {
  data: SeriesPoint[]; height?: number; color?: string; suffix?: string; formatValue?: (value: number) => string;
}) {
  const { colors } = useTheme();
  const { width, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const stroke = color || colors.primary;
  const pad = { top: 22, right: 12, bottom: 24, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((point) => point.value), 0));
  const x = (index: number) => pad.left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - (value / max) * innerH;
  const line = data.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`).join(' ');
  const area = data.length ? `${line} L${x(data.length - 1)},${pad.top + innerH} L${x(0)},${pad.top + innerH} Z` : '';
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const shown = active ?? data.length - 1;
  const format = formatValue || ((value: number) => `${value}${suffix}`);

  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={width} height={height} onPressIn={() => undefined}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0, 0.5, 1].map((ratio) => (
          <G key={ratio}>
            <Line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH * ratio} y2={pad.top + innerH * ratio} stroke={colors.border} strokeDasharray="4 6" />
            <SvgText x={pad.left - 8} y={pad.top + innerH * ratio + 4} fontSize={10} fill={colors.textSubtle} textAnchor="end" fontFamily={fonts.medium}>{Math.round(max * (1 - ratio))}</SvgText>
          </G>
        ))}
        {area ? <Path d={area} fill="url(#areaFill)" /> : null}
        {line ? <Path d={line} stroke={stroke} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {data.map((point, index) => (
          <G key={`${point.label}-${index}`}>
            <Circle cx={x(index)} cy={y(point.value)} r={index === shown ? 6 : 3.5} fill={index === shown ? colors.surface : stroke} stroke={stroke} strokeWidth={index === shown ? 3 : 0} />
            <Rect x={x(index) - innerW / Math.max(1, data.length) / 2} y={pad.top} width={innerW / Math.max(1, data.length)} height={innerH} fill="transparent" onPress={() => setActive(index)} />
            {index % labelEvery === 0 || index === data.length - 1 ? (
              <SvgText x={x(index)} y={height - 6} fontSize={10} fill={colors.textSubtle} textAnchor="middle" fontFamily={fonts.medium}>{point.label}</SvgText>
            ) : null}
          </G>
        ))}
        {data[shown] ? (
          <SvgText x={Math.min(Math.max(x(shown), pad.left + 20), width - pad.right - 20)} y={Math.max(12, y(data[shown].value) - 12)} fontSize={12} fontWeight="700" fill={colors.text} textAnchor="middle" fontFamily={fonts.bold}>
            {format(data[shown].value)}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

export function BarChart({ data, height = 180, color, formatValue }: { data: SeriesPoint[]; height?: number; color?: string; formatValue?: (value: number) => string }) {
  const { colors } = useTheme();
  const { width, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const pad = { top: 22, bottom: 22 };
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((point) => point.value), 0));
  const slot = width / Math.max(1, data.length);
  const barW = Math.min(28, slot * 0.58);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const shown = active ?? null;

  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={width} height={height}>
        <Line x1={0} x2={width} y1={pad.top + innerH} y2={pad.top + innerH} stroke={colors.border} />
        {data.map((point, index) => {
          const h = Math.max(point.value > 0 ? 4 : 0, (point.value / max) * innerH);
          const cx = slot * index + slot / 2;
          return (
            <G key={`${point.label}-${index}`} onPress={() => setActive(index)}>
              <Rect x={slot * index} y={pad.top} width={slot} height={innerH} fill="transparent" />
              <Rect x={cx - barW / 2} y={pad.top + innerH - h} width={barW} height={h} rx={Math.min(6, barW / 2)} fill={shown === index ? colors.primaryPressed : color || colors.primary} opacity={shown == null || shown === index ? 1 : 0.55} />
              {index % labelEvery === 0 ? <SvgText x={cx} y={height - 6} fontSize={10} fill={colors.textSubtle} textAnchor="middle" fontFamily={fonts.medium}>{point.label}</SvgText> : null}
              {shown === index ? <SvgText x={cx} y={Math.max(12, pad.top + innerH - h - 6)} fontSize={11} fill={colors.text} textAnchor="middle" fontFamily={fonts.bold}>{formatValue ? formatValue(point.value) : point.value}</SvgText> : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

export function DonutChart({ segments, size = 150, stroke = 18, centerLabel, centerValue }: {
  segments: { label: string; value: number; color: string }[]; size?: number; stroke?: number; centerLabel?: string; centerValue?: string;
}) {
  const { colors } = useTheme();
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceSunken} strokeWidth={stroke} fill="none" />
        {total > 0 ? segments.map((segment) => {
          const length = (segment.value / total) * c;
          const node = (
            <Circle key={segment.label} cx={size / 2} cy={size / 2} r={r} stroke={segment.color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${length} ${c - length}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          offset += length;
          return node;
        }) : null}
      </Svg>
      {centerValue ? <Text variant="number">{centerValue}</Text> : null}
      {centerLabel ? <Text variant="caption" color="textMuted">{centerLabel}</Text> : null}
    </View>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
          <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>{item.label}</Text>
          {item.value ? <Text variant="captionStrong">{item.value}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function Heatmap({ columns, onSelect }: { columns: { date: string; level: number; value: number }[][]; onSelect?: (cell: { date: string; value: number }) => void }) {
  const { colors, scheme } = useTheme();
  const { width, onLayout } = useWidth();
  const levels = scheme === 'dark'
    ? [colors.surfaceSunken, '#174A3A', '#1F7357', '#22A06F', '#3CD197']
    : ['#EEF3F1', '#C6EEDD', '#7FD8B2', '#2EBD86', '#07875F'];
  const gap = 4;
  const labelW = 26;
  const cell = Math.min(22, (width - labelW - gap * columns.length) / Math.max(1, columns.length));
  const days = ['Pzt', '', 'Çar', '', 'Cum', '', 'Paz'];
  return (
    <View onLayout={onLayout}>
      <View style={{ flexDirection: 'row', gap }}>
        <View style={{ width: labelW - gap, gap }}>
          {days.map((day, index) => <Text key={index} variant="caption" color="textSubtle" style={{ height: cell, fontSize: 9, lineHeight: cell }}>{day}</Text>)}
        </View>
        {columns.map((column, index) => (
          <View key={index} style={{ gap }}>
            {column.map((item) => (
              <View key={item.date} accessibilityLabel={`${item.date}: ${item.value} dakika`} onTouchEnd={() => onSelect?.(item)}
                style={{ width: cell, height: cell, borderRadius: 4, backgroundColor: levels[item.level] }} />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text variant="caption" color="textSubtle">Az</Text>
        {levels.map((color) => <View key={color} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />)}
        <Text variant="caption" color="textSubtle">Çok</Text>
      </View>
    </View>
  );
}

export function HorizontalBars({ items, max, suffix = '' }: { items: { label: string; value: number; color?: string; hint?: string }[]; max?: number; suffix?: string }) {
  const { colors } = useTheme();
  const top = max ?? Math.max(1, ...items.map((item) => item.value));
  return (
    <View style={{ gap: space.md }}>
      {items.map((item) => (
        <View key={item.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <Text variant="captionStrong" numberOfLines={1} style={{ flex: 1 }}>{item.label}</Text>
            <Text variant="captionStrong" color="textMuted">{item.hint ?? `${item.value}${suffix}`}</Text>
          </View>
          <View style={{ height: 8, borderRadius: radius.full, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (item.value / top) * 100)}%`, height: '100%', borderRadius: radius.full, backgroundColor: item.color || colors.primary }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: space.md },
});
