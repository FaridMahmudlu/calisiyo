'use client';

import { useRef } from 'react';
import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function Book({ position, rotation, color = '#00a870', scale = [1, 1.4, 0.2] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Cover */}
      <mesh scale={scale} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Pages */}
      <mesh position={[0.02, 0, 0]} scale={[scale[0] * 0.95, scale[1] * 0.96, scale[2] * 0.8]} castShadow>
        <boxGeometry />
        <meshStandardMaterial color="#fffdfa" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function HeroScene({ progressRef }) {
  const orbRef = useRef();

  useFrame((state, delta) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * 0.4;
      orbRef.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Central Glowing Calisiyo Core */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={orbRef} position={[0, 0.5, 0]}>
          <octahedronGeometry args={[1.2, 2]} />
          <meshStandardMaterial
            color="#00a870"
            emissive="#004d33"
            emissiveIntensity={0.6}
            roughness={0.1}
            metalness={0.8}
            wireframe={false}
          />
        </mesh>
      </Float>

      {/* Floating Study Books */}
      <Float speed={1.8} rotationIntensity={1} floatIntensity={1.5}>
        <Book position={[-2.2, 1.2, -1]} rotation={[0.4, 0.6, -0.2]} color="#00a870" />
      </Float>
      <Float speed={1.4} rotationIntensity={0.8} floatIntensity={1.2}>
        <Book position={[2.4, -0.6, 1]} rotation={[-0.3, -0.5, 0.3]} color="#3b82f6" />
      </Float>
      <Float speed={2.2} rotationIntensity={1.2} floatIntensity={1.8}>
        <Book position={[-1.8, -1.2, 0.5]} rotation={[0.6, -0.4, 0.1]} color="#8b5cf6" />
      </Float>

      {/* Decorative Floating Geometry */}
      <Float speed={1.5} floatIntensity={2}>
        <mesh position={[2, 1.8, -2]}>
          <torusGeometry args={[0.4, 0.12, 16, 32]} />
          <meshStandardMaterial color="#07875f" roughness={0.2} metalness={0.5} />
        </mesh>
      </Float>

      <Float speed={2} floatIntensity={1.5}>
        <mesh position={[-2.8, 0, 1.5]}>
          <tetrahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#a7f3d0" roughness={0.4} />
        </mesh>
      </Float>
    </group>
  );
}
