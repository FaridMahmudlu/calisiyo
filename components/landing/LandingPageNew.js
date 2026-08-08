'use client';

import React, { Component, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { checkDeviceCapability } from './DeviceCapability';
import LandingLightweight from './LandingLightweight';

// Code-split 3D experience — three.js/R3F are NEVER loaded unless capability check passes
const Landing3DExperience = dynamic(() => import('./Landing3DExperience'), {
  ssr: false,
  loading: () => <LandingLightweight />,
});

class ErrorBoundary3D extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('3D Landing Page fallen back to lightweight due to WebGL error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <LandingLightweight />;
    }
    return this.props.children;
  }
}

export default function LandingPageNew() {
  const [isCapable, setIsCapable] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCapable(checkDeviceCapability());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // During SSR or initial mount before check, render lightweight for instant LCP
  if (isCapable === null || !isCapable) {
    return <LandingLightweight />;
  }

  return (
    <ErrorBoundary3D>
      <Landing3DExperience />
    </ErrorBoundary3D>
  );
}
