'use client';

import { useRef } from 'react';
import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export function FocusScene() {
  const timerRingRef = useRef();
  const spotlightRef = useRef();

  useFrame((state, delta) => {
    if (timerRingRef.current) {
      timerRingRef.current.rotation.z -= delta * 0.3;
    }
  });

  return (
    <group position={[0, 0, -5]}>
      {/* 3D Pomodoro Timer Dial */}
      <Float speed={1.2} floatIntensity={0.6}>
        <group position={[0, 0, 0]}>
          {/* Main Dial Body */}
          <mesh scale={[1.8, 1.8, 0.4]} rotation={[Math.PI / 6, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1, 1, 0.3, 32]} />
            <meshStandardMaterial color="#10251f" roughness={0.2} metalness={0.8} />
          </mesh>

          {/* Glowing Timer Accent Ring */}
          <mesh ref={timerRingRef} position={[0, 0.05, 0.22]} rotation={[Math.PI / 6, 0, 0]}>
            <ringGeometry args={[0.7, 0.88, 32]} />
            <meshStandardMaterial color="#00a870" emissive="#00a870" emissiveIntensity={0.8} side={2} />
          </mesh>

          {/* Center Knob */}
          <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 6, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.1, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} />
          </mesh>
        </group>
      </Float>

      {/* Focus Zone Volumetric Ring */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.5, 64]} />
        <meshStandardMaterial color="#00a870" emissive="#00a870" emissiveIntensity={0.4} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
