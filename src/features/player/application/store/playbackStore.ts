// src/features/player/application/store/playbackStore.ts
import { create } from "zustand";
import {
  PlaybackState,
  AudioTrack,
  EffectSettings,
} from "../../domain/entities";
import { ToneEngine } from "../../infrastructure/ToneEngine";

let engine: ToneEngine | null = null;
let timeUpdateUnsubscribe: (() => void) | null = null;
let endedUnsubscribe: (() => void) | null = null;

interface PlaybackStore extends PlaybackState {
  isReady: boolean;
  isLoading: boolean;
  loadTrack: (track: AudioTrack) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setEffects: (effects: EffectSettings) => void;
  initEngine: () => void;
  getDuration: () => number;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Начальное состояние
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  currentTrackId: null,
  isReady: false,
  isLoading: false,

  // Инициализация движка
  initEngine: () => {
    if (!engine) engine = new ToneEngine();
  },

  // Загрузка трека
  loadTrack: async (track) => {
    if (!engine) {
      console.log("Initializing engine");
      get().initEngine();
    }

    const currentState = get();

    // Если трек уже загружен и готов, не перезагружаем
    if (currentState.currentTrackId === track.id && currentState.isReady) {
      console.log("Track already loaded and ready, skipping:", track.name);
      return;
    }

    // Если тот же трек уже загружается, не запускаем повторно
    if (currentState.currentTrackId === track.id && currentState.isLoading) {
      console.log("Track already loading, skipping:", track.name);
      return;
    }

    console.log(
      "Loading track:",
      track.name,
      "Current:",
      currentState.currentTrackId
    );

    // Отписываемся от предыдущих событий
    timeUpdateUnsubscribe?.();
    endedUnsubscribe?.();

    set({ isLoading: true, currentTrackId: track.id });

    try {
      // Загружаем буфер в движок
      await engine!.load(track.buffer);

      // Обновляем состояние
      set({
        currentTrackId: track.id,
        duration: engine!.getDuration(),
        currentTime: 0,
        isPlaying: false,
        isReady: true,
        isLoading: false,
      });

      console.log("Track loaded successfully:", track.name);

      // Подписываемся на обновления времени и конца трека
      timeUpdateUnsubscribe = engine!.onTimeUpdate((time) =>
        set({ currentTime: time })
      );
      endedUnsubscribe = engine!.onEnded(() =>
        set({ isPlaying: false, currentTime: engine!.getDuration() })
      );
    } catch (error) {
      console.error("Failed to load track:", track.name, error);
      set({ isLoading: false, isReady: false });
      throw error;
    }
  },

  // Воспроизведение
  play: () => {
    const { isReady } = get();
    if (!isReady || !engine) return; // не запускать пока не готово
    engine.play();
    set({ isPlaying: true });
  },

  // Пауза
  pause: () => {
    if (!engine) return;
    engine.pause();
    set({ isPlaying: false });
  },

  // Перемотка
  seek: (time) => {
    if (!engine || !get().isReady) return;
    engine.seek(time);
    set({ currentTime: time });
  },

  // Громкость
  setVolume: (volume) => {
    if (!engine) return;
    const v = Math.max(0, Math.min(1, volume));
    engine.setVolume(v);
    set({ volume: v });
  },

  // Скорость воспроизведения
  setPlaybackRate: (rate) => {
    if (!engine) return;
    const r = Math.max(0.25, Math.min(4, rate));
    engine.setPlaybackRate(r);
    set({ playbackRate: r });
  },

  // Эффекты
  setEffects: (effects) => {
    if (!engine) return;
    engine.setEffects(effects);
  },

  // Получение длительности текущего трека
  getDuration: () => {
    if (!engine) return 0;
    return engine.getDuration();
  },
}));
