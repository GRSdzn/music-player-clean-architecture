export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  currentTrackId: string | null;
}

export interface EffectSettings {
  reverbWet: number;
  bassGain: number;
}

export interface AudioTrack {
  id: string;
  name: string;
  buffer: ArrayBuffer;
  duration: number;
}
