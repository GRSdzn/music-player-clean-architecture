import { useEffect } from "react";
import { usePlaybackStore } from "../application/store/playbackStore";
import { useTracksStore } from "../application/store/tracksStore";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
    isReady,
    isLoading,
  } = usePlaybackStore();

  const { tracks, currentTrackId } = useTracksStore();
  const currentTrack = tracks.find((track) => track.id === currentTrackId);

  useEffect(() => {
    initEngine(); // инициализация только на клиенте
  }, [initEngine]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressChange = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  // Показываем плеер если есть трек (даже во время загрузки)
  if (!currentTrack) {
    return null;
  }

  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t transition-all duration-300 ease-in-out">
      <div className="flex items-center gap-4 px-6 py-4 max-w-screen-xl mx-auto">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Volume2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium truncate">
              {currentTrack.name}
            </h4>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : "Audio Track"}
            </p>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
          {/* Play/Pause Button */}
          <Button
            onClick={isPlaying ? pause : play}
            size="sm"
            variant="outline"
            className="w-10 h-10 rounded-full p-0"
            disabled={!isReady || isLoading}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground min-w-[40px] text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleProgressChange}
              className="flex-1"
              disabled={!isReady || isLoading}
            />
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={() => setVolume(volume > 0 ? 0 : 0.5)}
            disabled={!isReady || isLoading}
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
            disabled={!isReady || isLoading}
          />
        </div>
      </div>
    </div>
  );
}
