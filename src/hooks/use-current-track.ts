import { usePlaybackStore } from '@/features/player/application/store/playbackStore';
import { useTracksStore } from '@/features/player/application/store/tracksStore';
import { AudioTrack } from '@/features/player/domain/entities';

export interface CurrentTrackInfo {
  track: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  progress: number; // процент от 0 до 100
}

export function useCurrentTrack(): CurrentTrackInfo {
  const { 
    currentTrackId, 
    isPlaying, 
    isLoading, 
    currentTime, 
    duration 
  } = usePlaybackStore();
  
  const { tracks } = useTracksStore();
  
  const track = tracks.find(t => t.id === currentTrackId) || null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return {
    track,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress
  };
}

// Дополнительный хук для получения только названия трека
export function useCurrentTrackTitle(): string {
  const { track } = useCurrentTrack();
  return track?.name || 'Music Player';
}