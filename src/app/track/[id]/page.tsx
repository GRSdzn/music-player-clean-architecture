"use client";

import { useParams } from "next/navigation";
import { useTracksStore } from "@/features/player/application/store/tracksStore";
import { usePlaybackStore } from "@/features/player/application/store/playbackStore";
import { useEffect } from "react";

export default function TrackPage() {
  const { tracks, selectTrack } = useTracksStore();
  const { loadTrack } = usePlaybackStore();

  const { id: rawId } = useParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return null;

  useEffect(() => {
    const track = tracks.find((t) => t.id === id);
    if (track) {
      selectTrack(id);
      loadTrack(track);
    }
  }, [id, tracks, selectTrack, loadTrack]);

  return (
    <div>
      <h2>Редактирование трека: {id}</h2>
      {/* Тут будут элементы редактирования: эффекты, обрезка и т.д. */}
    </div>
  );
}
