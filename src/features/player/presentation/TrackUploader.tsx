"use client";
import { useTracksStore } from "../application/store/tracksStore";
import { usePlaybackStore } from "../application/store/playbackStore";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export function TrackUploader() {
  const { addTrack, selectTrack } = useTracksStore();
  const { loadTrack } = usePlaybackStore();
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();

    const track = {
      id: uuidv4(),
      name: file.name,
      buffer: arrayBuffer,
      duration: 0,
    };

    await addTrack(track); // сохраняем в store
    selectTrack(track.id); // выбираем трек
    await loadTrack(track); // загружаем в плеер

    // Авто-редирект на страницу трека
    router.push(`/track/${track.id}`);
  };

  return (
    <div className="track-uploader">
      <input type="file" accept="audio/*" onChange={handleFileChange} />
    </div>
  );
}
