'use client';

/**
 * Checks whether the current device is capable of running the 3D WebGL experience smoothly.
 * Returns false for mobile devices, low-spec hardware, software renderers, or users
 * who prefer reduced motion.
 */
export function checkDeviceCapability() {
  if (typeof window === 'undefined') return false;

  // 1. Reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  // 2. Viewport width check (<1024px defaults to lightweight path)
  if (window.innerWidth < 1024) {
    return false;
  }

  // 3. WebGL support check
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;

    // 4. GPU tier check (detect software rasterizers)
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      if (/swiftshader|llvmpipe|mesa|software|virtual/i.test(renderer)) {
        return false;
      }
    }
  } catch (e) {
    return false;
  }

  // 5. Hardware concurrency check (CPU cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return false;
  }

  // 6. Device memory check (GB) if available
  if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    return false;
  }

  return true;
}
