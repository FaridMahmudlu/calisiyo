import { BookOpenCheck, Coffee, Crown, Hand, LibraryBig, MessageCircleQuestion, Move, PersonStanding, Sparkles } from 'lucide-react-native';

// Mirrors components/classroom/ClassroomScene.js so positions, seats and
// zones mean the same thing for web and mobile members in one room.
export const REACTION_META = {
  hello: { label: 'Merhaba!', icon: Hand },
  focus: { label: 'Odaktayım', icon: BookOpenCheck },
  coffee: { label: 'Kısa mola', icon: Coffee },
  clap: { label: 'Harika!', icon: Sparkles },
  goal: { label: 'Devam!', icon: Crown },
  wave: { label: 'Buradayım', icon: Move },
  jump: { label: 'Zıpladı', icon: PersonStanding },
} as const;
export type ReactionKey = keyof typeof REACTION_META;

export const STATUS_LABEL: Record<string, string> = { studying: 'Çalışıyor', break: 'Molada', online: 'Sınıfta', offline: 'Çevrimdışı' };

export const ZONES = [
  { id: 'quiet', label: 'Sessiz odak', hint: 'Tek başına derinleş', x: 22, y: 27, icon: LibraryBig, status: 'studying' },
  { id: 'question', label: 'Soru masası', hint: 'Birlikte çöz', x: 71, y: 31, icon: MessageCircleQuestion, status: 'online' },
  { id: 'break', label: 'Mola köşesi', hint: 'Kısa bir nefes', x: 82, y: 78, icon: Coffee, status: 'break' },
] as const;

export const CLASSROOM_SEATS = [
  { id: 'desk_1', label: 'Ön sol sıra', x: 32, y: 52, deskX: 32, deskY: 41 },
  { id: 'desk_2', label: 'Ön sağ sıra', x: 66, y: 53, deskX: 66, deskY: 43 },
  { id: 'desk_3', label: 'Arka sol sıra', x: 27, y: 83, deskX: 27, deskY: 72 },
  { id: 'desk_4', label: 'Arka sağ sıra', x: 70, y: 81, deskX: 70, deskY: 69 },
] as const;
export type Seat = typeof CLASSROOM_SEATS[number];
export type Zone = typeof ZONES[number];

const OBSTACLES = CLASSROOM_SEATS.map((seat) => ({ left: seat.deskX - 8, right: seat.deskX + 8, top: seat.deskY - 6, bottom: seat.deskY + 7 }));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const isBlocked = ({ x, y }: { x: number; y: number }) => OBSTACLES.some((item) => (
  x >= item.left - 2.5 && x <= item.right + 2.5 && y >= item.top - 3 && y <= item.bottom + 3
));

export function resolveMovement(from: { x?: number; y?: number } | null, target: { x: number; y: number }) {
  const start = { x: Number(from?.x ?? 50), y: Number(from?.y ?? 72) };
  const end = { x: clamp(target.x, 4, 96), y: clamp(target.y, 8, 92) };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) / 1.5));
  let current = start;
  for (let index = 1; index <= steps; index += 1) {
    const candidate = { x: start.x + ((end.x - start.x) * index) / steps, y: start.y + ((end.y - start.y) * index) / steps };
    if (!isBlocked(candidate)) current = candidate;
    else if (!isBlocked({ x: candidate.x, y: current.y })) current = { x: candidate.x, y: current.y };
    else if (!isBlocked({ x: current.x, y: candidate.y })) current = { x: current.x, y: candidate.y };
  }
  return { x: clamp(current.x, 4, 96), y: clamp(current.y, 8, 92) };
}

export function facingFor(dx: number, dy: number, fallback = 'south') {
  const horizontal = Math.abs(dx) > 1.2 ? (dx < 0 ? 'west' : 'east') : '';
  const vertical = Math.abs(dy) > 1.2 ? (dy < 0 ? 'north' : 'south') : '';
  if (vertical && horizontal) return `${vertical}_${horizontal}`;
  return horizontal || vertical || fallback;
}

export type Member = {
  userId: string; name: string; role?: string; presence: string; focusSubject?: string | null; positionX?: number; positionY?: number; facing?: string;
  pose?: string; seatId?: string | null; avatarModel?: string | null; weeklyMinutes?: number; studyDays?: number | null; streak?: number; questions?: number;
};
export type Position = { x: number; y: number; facing: string };
