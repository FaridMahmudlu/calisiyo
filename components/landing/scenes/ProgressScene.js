'use client';

import { Float } from '@react-three/drei';

function Bar({ position, height, color = '#00a870' }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, height, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Top glowing cap */}
      <mesh position={[0, height + 0.05, 0]}>
        <boxGeometry args={[0.52, 0.08, 0.52]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export function ProgressScene() {
  return (
    <group position={[3, 1, -10]}>
      {/* 3D Bar Chart Columns */}
      <Bar position={[-1.2, -1, 0]} height={1.2} color="#00a870" />
      <Bar position={[-0.4, -1, 0]} height={1.8} color="#3b82f6" />
      <Bar position={[0.4, -1, 0]} height={2.4} color="#8b5cf6" />
      <Bar position={[1.2, -1, 0]} height={3.2} color="#00a870" />

      {/* Target Achievement Star */}
      <Float speed={2} floatIntensity={1}>
        <mesh position={[1.2, 2.8, 0.5]}>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      </Float>
    </group>
  );
}
