'use client';

import { useEffect } from 'react';
import { useCurrentTrackTitle } from '@/hooks/use-current-track';

export function DynamicTitle() {
  const trackTitle = useCurrentTrackTitle();

  useEffect(() => {
    document.title = trackTitle;
  }, [trackTitle]);

  return null;
}
