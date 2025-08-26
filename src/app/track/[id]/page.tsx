"use client";

import { useParams } from "next/navigation";
import { useTracksStore } from "@/features/player/application/store/tracksStore";
import { usePlaybackStore } from "@/features/player/application/store/playbackStore";
import { useEffect } from "react";
import { useRedirectIfNoTrack } from "@/hooks/use-redirect-if-no-track";

export default function TrackPage() {
  const { tracks, selectTrack } = useTracksStore();
  const { loadTrack } = usePlaybackStore();

  const { id: rawId } = useParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const name = tracks.find((t) => t.id === id)?.name;
  const isTrackSelected = useRedirectIfNoTrack();
  if (!id) return null;

  useEffect(() => {
    const track = tracks.find((t) => t.id === id);
    if (track) {
      selectTrack(id);
      loadTrack(track);
    } else {
      isTrackSelected;
    }
  }, [id, tracks, selectTrack, loadTrack, isTrackSelected]);

  return (
    <div>
      <h2>Редактирование тsрека: {name}</h2>

      {/* Тут будут элементы редактирования: эффекты, обрезка и т.д. */}
    </div>
  );
}
