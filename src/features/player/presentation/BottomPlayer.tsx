import { useEffect } from "react";
import { usePlaybackStore } from "../application/store/playbackStore";

export function BottomPlayer() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    play,
    pause,
    seek,
    setVolume,
    initEngine,
  } = usePlaybackStore();
  useEffect(() => {
    initEngine(); // инициализация только на клиенте
  }, [initEngine]);
  return (
    <div className="bottom-player">
      <button onClick={isPlaying ? pause : play}>
        {isPlaying ? "⏸️" : "▶️"}
      </button>

      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
      />

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
      />
    </div>
  );
}
