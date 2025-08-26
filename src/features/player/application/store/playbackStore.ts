// src/features/player/application/store/playbackStore.ts

import { create } from "zustand";
import {
  PlaybackState,
  AudioTrack,
  EffectSettings,
} from "../../domain/entities";
import { ToneEngine } from "../../infrastructure/ToneEngine";

const engine = new ToneEngine();
let timeUpdateUnsubscribe: (() => void) | null = null;
let endedUnsubscribe: (() => void) | null = null;

interface PlaybackStore extends PlaybackState {
  loadTrack: (track: AudioTrack) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setEffects: (effects: EffectSettings) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Начальное состояние
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  currentTrackId: null,

  // Действия
  loadTrack: async (track) => {
    // Отписываемся от предыдущих событий чтобы избежать утечек памяти
    timeUpdateUnsubscribe?.();
    endedUnsubscribe?.();

    await engine.load(track.buffer);

    set({
      currentTrackId: track.id,
      duration: engine.getDuration(),
      currentTime: 0,
      isPlaying: false,
    });

    // Подписываемся на новые события
    timeUpdateUnsubscribe = engine.onTimeUpdate((time) => {
      set({ currentTime: time });
    });

    endedUnsubscribe = engine.onEnded(() => {
      set({ isPlaying: false, currentTime: engine.getDuration() });
    });
  },

  play: () => {
    engine.play();
    set({ isPlaying: true });
  },

  pause: () => {
    engine.pause();
    set({ isPlaying: false });
  },

  seek: (time) => {
    engine.seek(time);
    set({ currentTime: time });
  },

  setVolume: (volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    engine.setVolume(clampedVolume);
    set({ volume: clampedVolume });
  },

  setPlaybackRate: (rate) => {
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    engine.setPlaybackRate(clampedRate);
    set({ playbackRate: clampedRate });
  },

  setEffects: (effects) => {
    engine.setEffects(effects);
  },
}));
