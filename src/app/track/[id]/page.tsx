"use client";

import { useParams } from "next/navigation";
import { useTracksStore } from "@/features/player/application/store/tracksStore";
import { usePlaybackStore } from "@/features/player/application/store/playbackStore";
import { useEffect } from "react";
import { useRedirectIfNoTrack } from "@/hooks/use-redirect-if-no-track";
import { LoadingFullScreen } from "@/components/loading-screen";

export default function TrackPage() {
  const { tracks, selectTrack } = useTracksStore();
  const { loadTrack, isLoading } = usePlaybackStore();

  const { id: rawId } = useParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const name = tracks.find((t) => t.id === id)?.name;
  const isTrackSelected = useRedirectIfNoTrack();

  useEffect(() => {
    if (!id) return; // Перенесли проверку внутрь useEffect

    const track = tracks.find((t) => t.id === id);
    if (track) {
      selectTrack(id);
      loadTrack(track);
    } else {
      // Убрали неиспользуемое выражение
      // isTrackSelected уже выполняет свою логику при вызове
    }
  }, [id, tracks, selectTrack, loadTrack, isTrackSelected]);

  // Добавили проверку для раннего возврата после всех хуков
  if (!id) return null;

  if (isLoading) {
    return <LoadingFullScreen />;
  }

  return (
    <div>
      <h2>Редактирование трека: {name}</h2>
      {/* Тут будут элементы редактирования: эффекты, обрезка и т.д. */}
    </div>
  );
}
