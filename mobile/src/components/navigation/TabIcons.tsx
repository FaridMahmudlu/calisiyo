import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Custom duotone tab icons (24x24). Inactive: thin outline. Active: soft fill,
// bolder stroke and one amber detail that echoes the logo's goal flag.
export type TabIconProps = { active: boolean; color: string; accent: string; size?: number };

const stroke = (active: boolean) => (active ? 2.1 : 1.8);
const soft = (active: boolean) => (active ? 0.22 : 0);

export function HomeIcon({ active, color, accent, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 10.4 12 4l8 6.4V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19v-8.6Z" fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} strokeLinejoin="round" />
      <Path d="M9.6 20.6v-5.2a2.4 2.4 0 0 1 4.8 0v5.2" stroke={active ? accent : color} strokeWidth={stroke(active)} strokeLinecap="round" />
    </Svg>
  );
}

export function ProgramIcon({ active, color, accent, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.6} y={5.2} width={16.8} height={15.2} rx={3.4} fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} />
      <Path d="M3.6 9.8h16.8M8.2 3.4v3.4M15.8 3.4v3.4" stroke={color} strokeWidth={stroke(active)} strokeLinecap="round" />
      <Circle cx={8.4} cy={14} r={1.05} fill={color} />
      <Circle cx={12} cy={14} r={1.05} fill={color} />
      <Rect x={14.3} y={12.6} width={3.2} height={3.2} rx={1} fill={active ? accent : color} />
      <Circle cx={8.4} cy={17.4} r={1.05} fill={color} />
    </Svg>
  );
}

export function TimerIcon({ active, color, accent, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13.4} r={7.6} fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} />
      <Path d="M9.6 2.8h4.8M12 2.8v3M18.4 6.4l1.3-1.3" stroke={color} strokeWidth={stroke(active)} strokeLinecap="round" />
      {active ? <Path d="M12 13.4V5.8a7.6 7.6 0 0 1 6.6 3.8L12 13.4Z" fill={accent} /> : null}
      <Path d="M12 13.4 15.2 10.2" stroke={active ? accent : color} strokeWidth={stroke(active)} strokeLinecap="round" />
      <Circle cx={12} cy={13.4} r={1.3} fill={color} />
    </Svg>
  );
}

export function ClassIcon({ active, color, accent, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9.2} cy={8.4} r={3.4} fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} />
      <Path d="M3.4 19.6c.5-3.3 2.8-5.4 5.8-5.4s5.3 2.1 5.8 5.4" fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} strokeLinecap="round" />
      <Circle cx={16.6} cy={9.2} r={2.6} stroke={active ? accent : color} strokeWidth={stroke(active)} fill={active ? accent : 'none'} fillOpacity={active ? 0.35 : 0} />
      <Path d="M17.2 14.4c2 .4 3.3 2.2 3.6 4.6" stroke={active ? accent : color} strokeWidth={stroke(active)} strokeLinecap="round" />
    </Svg>
  );
}

export function MoreIcon({ active, color, accent, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={6.6} height={6.6} rx={2.2} fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} />
      <Rect x={13.4} y={4} width={6.6} height={6.6} rx={3.3} fill={active ? accent : 'none'} stroke={active ? accent : color} strokeWidth={stroke(active)} />
      <Rect x={4} y={13.4} width={6.6} height={6.6} rx={2.2} fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} />
      <Rect x={13.4} y={13.4} width={6.6} height={6.6} rx={2.2} fill={color} fillOpacity={soft(active)} stroke={color} strokeWidth={stroke(active)} />
    </Svg>
  );
}
