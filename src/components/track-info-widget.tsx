import { useCurrentTrack } from '@/hooks/use-current-track';

export function TrackInfoWidget() {
  const { track, isPlaying, progress } = useCurrentTrack();

  if (!track) return null;

  return (
    <div className="p-4 bg-card rounded-lg">
      <h3 className="font-semibold">{track.name}</h3>
      <div className="flex items-center gap-2 mt-2">
        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-sm text-muted-foreground">{isPlaying ? 'Playing' : 'Paused'}</span>
      </div>
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
