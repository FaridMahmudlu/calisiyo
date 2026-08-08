'use client';

import { useRef } from 'react';
import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export function SummitScene() {
  const portalRef = useRef();

  useFrame((state, delta) => {
    if (portalRef.current) {
      portalRef.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <group position={[0, 3, -16]}>
      {/* Portal Arch */}
      <mesh scale={[3.5, 5, 0.4]} position={[0, 0, 0]}>
        <torusGeometry args={[1, 0.12, 16, 64]} />
        <meshStandardMaterial color="#00a870" emissive="#00a870" emissiveIntensity={0.6} metalness={0.9} />
      </mesh>

      {/* Inner Glowing Core */}
      <mesh ref={portalRef} position={[0, 0, -0.1]}>
        <ringGeometry args={[0.2, 0.95, 32]} />
        <meshStandardMaterial color="#ecfdf5" emissive="#00a870" emissiveIntensity={0.9} side={2} />
      </mesh>

      {/* Floating Sparkles around Portal */}
      <Float speed={3} floatIntensity={2}>
        <mesh position={[-1.8, 1.5, 0.5]}>
          <dodecahedronGeometry args={[0.25]} />
          <meshStandardMaterial color="#a7f3d0" emissive="#00a870" />
        </mesh>
      </Float>
      <Float speed={2.5} floatIntensity={1.8}>
        <mesh position={[1.9, -1.2, 0.3]}>
          <dodecahedronGeometry args={[0.3]} />
          <meshStandardMaterial color="#a7f3d0" emissive="#00a870" />
        </mesh>
      </Float>
    </group>
  );
}
