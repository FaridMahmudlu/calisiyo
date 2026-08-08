'use client';

import { Float } from '@react-three/drei';

function PlanCard({ position, rotation, label, time, color = '#00a870' }) {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <group position={position} rotation={rotation}>
        {/* Card base */}
        <mesh scale={[2.2, 0.8, 0.08]} castShadow receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>

        {/* Color accent strip */}
        <mesh position={[-1.02, 0, 0.05]} scale={[0.1, 0.74, 0.02]}>
          <boxGeometry />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Status check dot */}
        <mesh position={[0.85, 0, 0.05]}>
          <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      </group>
    </Float>
  );
}

export function PlanScene() {
  return (
    <group position={[-3, 0.5, -1]}>
      {/* Floating Schedule Cards */}
      <PlanCard
        position={[-0.5, 1.2, 0]}
        rotation={[0.1, 0.2, -0.05]}
        label="Paragraf · 40 dk"
        time="08:00"
        color="#00a870"
      />
      <PlanCard
        position={[0.2, 0.2, 0.8]}
        rotation={[-0.1, -0.1, 0.08]}
        label="TYT Matematik · 60 dk"
        time="11:00"
        color="#8b5cf6"
      />
      <PlanCard
        position={[-0.8, -0.8, -0.5]}
        rotation={[0.15, 0.15, -0.04]}
        label="Fizik · 40 dk"
        time="15:00"
        color="#3b82f6"
      />

      {/* Background Calendar Matrix Grid */}
      <group position={[0, 0, -1.5]} rotation={[0, 0.2, 0]}>
        <mesh scale={[3.4, 2.6, 0.05]}>
          <boxGeometry />
          <meshStandardMaterial color="#f1f5f9" roughness={0.5} transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}
