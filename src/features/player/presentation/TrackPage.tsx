"use client";
import { useParams } from "next/navigation";
import { useTracksStore } from "@/features/player/application/store/tracksStore";
import { usePlaybackStore } from "@/features/player/application/store/playbackStore";
import { useEffect } from "react";

export default function TrackPage() {
  const { id } = useParams();
  const { tracks, selectTrack } = useTracksStore();
  const { loadTrack } = usePlaybackStore();

  useEffect(() => {
    if (!id) return;
    const track = tracks.find((t) => t.id === id);
    if (track) {
      selectTrack(track.id);
      loadTrack(track);
    }
  }, [id, tracks, selectTrack, loadTrack]);

  return (
    <div>
      <h2>Track: {id}</h2>
      {/* Тут эффекты, обрезка и прочее */}
    </div>
  );
}
