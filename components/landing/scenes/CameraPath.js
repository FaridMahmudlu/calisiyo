'use client';

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraPath reads normalized scroll progress (0 -> 1)
 * and smoothly moves the camera along a 3D CatmullRomCurve3 path.
 */
export function CameraPath({ progressRef }) {
  // Pre-calculated camera path points through 3D space
  const pathPoints = [
    new THREE.Vector3(0, 2, 8),    // Hero view (looking at desk/logo)
    new THREE.Vector3(-4, 1, 3),   // Planla view (looking left at calendar)
    new THREE.Vector3(0, 0, -2),   // Odaklan view (looking center at pomodoro)
    new THREE.Vector3(4, 2, -7),   // İlerle view (looking right at charts)
    new THREE.Vector3(0, 5, -12),  // Summit view (looking down at portal)
  ];

  const curve = new THREE.CatmullRomCurve3(pathPoints);

  // Look-at target points corresponding to each section
  const lookAtPoints = [
    new THREE.Vector3(0, 0, 0),     // Hero center
    new THREE.Vector3(-3, 0.5, -1), // Planla center
    new THREE.Vector3(0, 0, -5),    // Odaklan center
    new THREE.Vector3(3, 1, -10),   // İlerle center
    new THREE.Vector3(0, 3, -16),   // Summit center
  ];

  const lookAtCurve = new THREE.CatmullRomCurve3(lookAtPoints);

  const currentCamPos = new THREE.Vector3();
  const currentLookAt = new THREE.Vector3();

  useFrame(({ camera }) => {
    const p = Math.max(0, Math.min(1, progressRef.current || 0));

    // Sample camera position along curve
    curve.getPointAt(p, currentCamPos);
    lookAtCurve.getPointAt(p, currentLookAt);

    // Smooth interpolation (lerp) for smooth camera feel
    camera.position.lerp(currentCamPos, 0.08);

    // Dynamic look-at
    camera.lookAt(currentLookAt);
  });

  return null;
}
