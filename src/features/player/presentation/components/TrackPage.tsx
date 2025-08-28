'use client';

import { useParams } from 'next/navigation';
import { useTracksStore } from '@/features/player/application/store/tracksStore';
import { usePlaybackStore } from '@/features/player/application/store/playbackStore';
import { useEffect, useCallback } from 'react';
import { useRedirectIfNoTrack } from '@/hooks/use-redirect-if-no-track';
import { useCurrentTrack } from '@/hooks/use-current-track';
import { LoadingFullScreen } from '@/components/loading-screen';
import EffectsPanel from '@/features/player/presentation/components/EffectsPanel';

export default function TrackPagePresentaion() {
  const { tracks, selectTrack } = useTracksStore();
  const { loadTrack } = usePlaybackStore();
  const { track: currentTrack, isLoading } = useCurrentTrack();

  const { id: rawId } = useParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // Вызываем хук, но не используем результат в зависимостях
  useRedirectIfNoTrack();

  // Мемоизируем функцию загрузки
  const handleTrackLoad = useCallback(async () => {
    if (!id) return;

    const track = tracks.find((t) => t.id === id);
    if (track) {
      selectTrack(id);
      // Загружаем трек только если он еще не загружен
      if (!currentTrack || currentTrack.id !== id) {
        console.log('Loading track from TrackPage:', track.name);
        await loadTrack(track);
      } else {
        console.log('Track already loaded, skipping:', track.name);
      }
    }
  }, [id, tracks, currentTrack, selectTrack, loadTrack]);

  useEffect(() => {
    handleTrackLoad();
  }, [handleTrackLoad]);

  // Добавили проверку для раннего возврата после всех хуков
  if (!id) return null;

  if (isLoading) {
    return <LoadingFullScreen />;
  }

  return (
    <div>
      <EffectsPanel />
    </div>
  );
}
