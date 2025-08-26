"use client";
import { useTracksStore } from "../application/store/tracksStore";
import { usePlaybackStore } from "../application/store/playbackStore";
import { useRouter } from "next/navigation";
import { TrackUploader } from "./TrackUploader";
import Link from "next/link";

export function Sidebar() {
  const { tracks, selectTrack } = useTracksStore();
  const { loadTrack } = usePlaybackStore();
  const router = useRouter();

  const handleClick = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;

    selectTrack(id);
    await loadTrack(track);

    router.push(`/track/${id}`); // переход на страницу трека
  };

  return (
    <div className="sidebar">
      <Link href="/">
        <div className="logo">Audio Editor</div>
      </Link>
      <TrackUploader /> {/* кнопка загрузки */}
      {tracks.map((track) => (
        <div
          key={track.id}
          className="track-item"
          onClick={() => handleClick(track.id)}
        >
          {track.name}
        </div>
      ))}
    </div>
  );
}
