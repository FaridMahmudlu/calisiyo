'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck, Coffee, Crown, Hand, Keyboard, LibraryBig,
  MessageCircleQuestion, MousePointer2, Move, Sparkles,
} from 'lucide-react';
import ClassroomAvatar from './ClassroomAvatar';

export const REACTION_META = {
  hello: { label: 'Merhaba!', icon: Hand },
  focus: { label: 'Odaktayım', icon: BookOpenCheck },
  coffee: { label: 'Kısa mola', icon: Coffee },
  clap: { label: 'Harika!', icon: Sparkles },
  goal: { label: 'Devam!', icon: Crown },
  wave: { label: 'Buradayım', icon: Move },
};

const STATUS_LABEL = {
  studying: 'Çalışıyor',
  break: 'Molada',
  online: 'Sınıfta',
  offline: 'Çevrimdışı',
};

const ZONES = [
  { id: 'quiet', label: 'Sessiz odak', hint: 'Tek başına derinleş', x: 22, y: 27, icon: LibraryBig, status: 'studying' },
  { id: 'question', label: 'Soru masası', hint: 'Birlikte çöz', x: 71, y: 31, icon: MessageCircleQuestion, status: 'online' },
  { id: 'break', label: 'Mola köşesi', hint: 'Kısa bir nefes', x: 82, y: 78, icon: Coffee, status: 'break' },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function ClassroomScene({
  room,
  members,
  userId,
  localPosition,
  reactions,
  onMove,
  onEnterZone,
  onOpenAvatar,
}) {
  const playfieldRef = useRef(null);
  const dragRef = useRef(false);
  const movedRef = useRef(false);
  const movementTimerRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [moving, setMoving] = useState(false);
  const [reactionNow, setReactionNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setReactionNow(Date.now()), 1000);
    return () => {
      window.clearInterval(timer);
      if (movementTimerRef.current) window.clearTimeout(movementTimerRef.current);
    };
  }, []);

  const latestReactions = useMemo(() => {
    const entries = new Map();
    for (const reaction of reactions || []) {
      if (Date.parse(reaction.createdAt) <= reactionNow - 12000) continue;
      if (!entries.has(reaction.userId)) entries.set(reaction.userId, reaction);
    }
    return entries;
  }, [reactionNow, reactions]);

  const getPosition = (event) => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 8, 92),
    };
  };

  const facingForDelta = (dx, dy, fallback = 'south') => {
    const horizontal = Math.abs(dx) > 1.2 ? (dx < 0 ? 'west' : 'east') : '';
    const vertical = Math.abs(dy) > 1.2 ? (dy < 0 ? 'north' : 'south') : '';
    if (vertical && horizontal) return `${vertical}_${horizontal}`;
    return horizontal || vertical || fallback;
  };

  const markMoving = () => {
    setMoving(true);
    if (movementTimerRef.current) window.clearTimeout(movementTimerRef.current);
    movementTimerRef.current = window.setTimeout(() => setMoving(false), 220);
  };

  const moveFromPointer = (event, immediate = false) => {
    const next = getPosition(event);
    if (!next) return;
    const facing = facingForDelta(next.x - Number(localPosition?.x ?? 50), next.y - Number(localPosition?.y ?? 72), localPosition?.facing);
    markMoving();
    onMove({ ...next, facing }, { immediate });
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const isOwnCharacter = event.target.closest(`[data-player-id="${userId}"]`);
    movedRef.current = false;
    if (isOwnCharacter) {
      dragRef.current = true;
      playfieldRef.current?.setPointerCapture?.(event.pointerId);
    } else {
      moveFromPointer(event, true);
    }
    playfieldRef.current?.focus({ preventScroll: true });
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    movedRef.current = true;
    moveFromPointer(event);
  };

  const finishDrag = (event) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    moveFromPointer(event, true);
    playfieldRef.current?.releasePointerCapture?.(event.pointerId);
  };

  const handleKeyDown = (event) => {
    const directions = {
      ArrowLeft: [-3, 0], a: [-3, 0], A: [-3, 0],
      ArrowRight: [3, 0], d: [3, 0], D: [3, 0],
      ArrowUp: [0, -4], w: [0, -4], W: [0, -4],
      ArrowDown: [0, 4], s: [0, 4], S: [0, 4],
    };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    const x = clamp(Number(localPosition?.x ?? 50) + delta[0], 4, 96);
    const y = clamp(Number(localPosition?.y ?? 72) + delta[1], 8, 92);
    markMoving();
    onMove({ x, y, facing: facingForDelta(delta[0], delta[1], localPosition?.facing) });
  };

  return (
    <article className={`classroom-world study-panel theme-${room.theme || 'sunny'}`}>
      <header className="classroom-world-header">
        <div className="classroom-blackboard">
          <span>{room.name}</span>
          <small>{room.motto}</small>
        </div>
        <div className="movement-help"><MousePointer2 size={14} /><span>Tıkla veya sürükle</span><Keyboard size={14} /><span>WASD / oklar</span></div>
      </header>

      <div
        ref={playfieldRef}
        className={`classroom-playfield ${focused ? 'has-focus' : ''}`}
        role="application"
        tabIndex={0}
        aria-label="Canlı sınıf alanı. Hareket etmek için alana dokunabilir, karakterini sürükleyebilir veya ok tuşlarını kullanabilirsin."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="classroom-window" aria-hidden="true"><i /><i /><i /></div>
        <div className="classroom-rug" aria-hidden="true" />

        {ZONES.map((zone) => {
          const Icon = zone.icon;
          return (
            <button
              type="button"
              key={zone.id}
              className={`classroom-zone zone-${zone.id}`}
              style={{ '--zone-x': `${zone.x}%`, '--zone-y': `${zone.y}%` }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onEnterZone(zone)}
            >
              <span><Icon size={18} /></span><strong>{zone.label}</strong><small>{zone.hint}</small>
            </button>
          );
        })}

        {members.map((member) => {
          const isMe = member.userId === userId;
          const position = isMe && localPosition ? localPosition : {
            x: Number(member.positionX ?? 50),
            y: Number(member.positionY ?? 72),
            facing: member.facing || 'east',
          };
          const reaction = latestReactions.get(member.userId);
          const reactionMeta = reaction ? REACTION_META[reaction.reaction] : null;
          const ReactionIcon = reactionMeta?.icon;
          const avatarContent = (
            <>
              <ClassroomAvatar avatar={{ model: member.avatarModel }} name={member.name} size={104} facing={position.facing} moving={isMe && moving} />
              {member.role === 'owner' && <i className="character-crown"><Crown size={12} /></i>}
              <i className="character-status-dot" />
            </>
          );
          return (
            <div
              key={member.userId}
              data-player-id={member.userId}
              className={`classroom-character is-${member.presence} ${isMe ? 'is-me' : ''} is-facing-${position.facing}`}
              style={{ '--player-x': `${position.x}%`, '--player-y': `${position.y}%`, zIndex: Math.round(Number(position.y || 50)) + 20 }}
            >
              {reactionMeta && <span className="character-reaction"><ReactionIcon size={14} />{reactionMeta.label}</span>}
              {isMe ? (
                <button
                  type="button"
                  className="character-avatar-button"
                  aria-label="Karakterini özelleştir"
                  onClick={(event) => { if (!movedRef.current) { event.stopPropagation(); onOpenAvatar(); } }}
                >{avatarContent}</button>
              ) : <div className="character-avatar-button">{avatarContent}</div>}
              <div className="character-label">
                <strong>{isMe ? 'Sen' : member.name}</strong>
                <span>{STATUS_LABEL[member.presence] || STATUS_LABEL.offline}</span>
                {member.focusSubject && <small>{member.focusSubject}</small>}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="classroom-world-footer">
        <span><i className="dot studying" />Çalışıyor</span><span><i className="dot break" />Molada</span><span><i className="dot online" />Sınıfta</span><span><i className="dot offline" />Çevrimdışı</span>
        <em><Move size={14} /> Konumun sınıf üyeleriyle anlık paylaşılır.</em>
      </footer>
    </article>
  );
}
