'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Avatar, Style } from '@dicebear/core';
import adventurer from '@dicebear/styles/adventurer.json';

const avatarStyle = new Style(adventurer);

export const AVATAR_OPTIONS = {
  hair: [
    'short01', 'short02', 'short03', 'short04', 'short05', 'short06',
    'short07', 'short08', 'short09', 'short10', 'long01', 'long02',
    'long03', 'long04', 'long05', 'long06',
  ],
  skin: ['f2d3b1', 'ecad80', '9e5622', '763900'],
  hairColor: ['0e0e0e', 'e5d7a3', 'b9a05f', '796a45', '6a4e35', '562306', 'afafaf', '85c2c6', 'dba3be', '592454', 'ac6511', 'cb6820'],
  background: ['e8f7f1', 'eaf2ff', 'fff1df', 'f0ebff', 'ffe9ef', 'e8f4f8'],
  glasses: ['none', 'variant01', 'variant02', 'variant03', 'variant04', 'variant05'],
  expression: ['variant01', 'variant05', 'variant10', 'variant14', 'variant18', 'variant22'],
};

export const DEFAULT_AVATAR = {
  seed: 'calisiyo-student',
  hair: 'short01',
  skin: 'f2d3b1',
  hairColor: '0e0e0e',
  background: 'e8f7f1',
  glasses: 'none',
  expression: 'variant01',
};

export function buildAvatarDataUri(input = DEFAULT_AVATAR) {
  const avatar = { ...DEFAULT_AVATAR, ...input };
  return new Avatar(avatarStyle, {
    seed: avatar.seed,
    hairVariant: avatar.hair,
    skinColor: avatar.skin,
    hairColor: avatar.hairColor,
    backgroundColor: avatar.background,
    mouthVariant: avatar.expression,
    glassesVariant: avatar.glasses === 'none' ? 'variant01' : avatar.glasses,
    glassesProbability: avatar.glasses === 'none' ? 0 : 100,
    earringsProbability: 0,
    detailsProbability: 0,
    size: 160,
    borderRadius: 28,
  }).toDataUri();
}

export default function ClassroomAvatar({ avatar, name, size = 80, priority = false, className = '' }) {
  const source = useMemo(() => buildAvatarDataUri(avatar), [avatar]);
  return (
    <Image
      className={className}
      src={source}
      alt={`${name || 'Öğrenci'} karakteri`}
      width={size}
      height={size}
      unoptimized
      priority={priority}
      draggable={false}
    />
  );
}
