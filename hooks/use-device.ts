'use client';

import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTouch: boolean;
  isDesktop: boolean;
  isClient: boolean;
}

const MOBILE_BREAKPOINT = 768;

/**
 * SSR-safe device detection hook
 * Returns device info for adaptive UI components
 */
export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTouch: false,
    isDesktop: true,
    isClient: false,
  });

  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setDeviceInfo({
        isMobile,
        isTouch,
        isDesktop: !isMobile,
        isClient: true,
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceInfo;
}

/**
 * Simple mobile check for components that only need boolean
 */
export function useIsMobile(): boolean {
  const { isMobile } = useDevice();
  return isMobile;
}

/**
 * Touch detection for interaction-specific logic
 */
export function useIsTouch(): boolean {
  const { isTouch } = useDevice();
  return isTouch;
}