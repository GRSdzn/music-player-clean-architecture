export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  currentTrackId: string | null;
}

export interface Region {
  start: number; // сек от начала
  end: number | null; // null = до конца трека
  loop: boolean; // луп региона
}

export interface EffectSettings {
  // Реалтайм-дружественные параметры
  reverbWet: number; // 0..1
  roomSize: number; // 0..1 (для Freeverb)
  dampening: number; // Гц (напр. 1000..8000)
  bassGain: number; // дБ (-12..+12)
  pitch: number; // полутонов (-12..+12), через PitchShift
}

export interface AudioTrack {
  id: string;
  name: string;
  buffer: ArrayBuffer;
  duration: number;
}
