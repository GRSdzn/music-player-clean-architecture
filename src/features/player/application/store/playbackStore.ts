import { create } from "zustand";
import {
  PlaybackState,
  AudioTrack,
  EffectSettings,
  Region,
} from "../../domain/entities";
import { ToneEngine } from "../../infrastructure/ToneEngine";

let engine: ToneEngine | null = null;
let timeUpdateUnsubscribe: (() => void) | null = null;
let endedUnsubscribe: (() => void) | null = null;

type PresetName = "slowedReverb" | "bassBoost" | "nightcore" | "default";

interface PlaybackStore extends PlaybackState {
  isReady: boolean;
  isLoading: boolean;

  initEngine: () => void;
  loadTrack: (track: AudioTrack) => Promise<void>;

  play: () => void;
  pause: () => void;
  seek: (time: number) => void;

  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;

  // Редактирование
  effects: EffectSettings;
  region: Region | null;

  // Устанавливаем частично (partial)
  setEffects: (effects: Partial<EffectSettings>) => void;
  // Для низкоуровневых быстрых обновлений (под слайдеры)
  setEffect: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;

  setRegion: (region: Region | null) => void;
  applyPreset: (preset: PresetName) => void;

  getDuration: () => number;
}

const DEFAULT_EFFECTS: EffectSettings = {
  reverbWet: 0.2,
  roomSize: 0.3,
  dampening: 3000,
  bassGain: 0,
  pitch: 0,
};

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Базовое воспроизведение
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  currentTrackId: null,

  // Служебное
  isReady: false,
  isLoading: false,

  // Редактирование
  effects: DEFAULT_EFFECTS,
  region: null,

  initEngine: () => {
    if (!engine) engine = new ToneEngine();
  },

  loadTrack: async (track) => {
    if (!engine) get().initEngine();

    // отписка
    timeUpdateUnsubscribe?.();
    endedUnsubscribe?.();

    set({ isLoading: true, isReady: false, currentTrackId: track.id });

    try {
      await engine!.load(track.buffer);

      // применим текущие настройки (эффекты/регион) к новому плееру
      engine!.setEffects(get().effects);
      if (get().region) engine!.setRegion(get().region);

      set({
        duration: engine!.getDuration(),
        currentTime: 0,
        isPlaying: false,
        isReady: true,
        isLoading: false,
      });

      timeUpdateUnsubscribe = engine!.onTimeUpdate((time) =>
        set({ currentTime: time })
      );
      endedUnsubscribe = engine!.onEnded(() =>
        set({ isPlaying: false, currentTime: engine!.getDuration() })
      );
    } catch (e) {
      set({ isLoading: false, isReady: false });
      throw e;
    }
  },

  play: () => {
    if (!engine || !get().isReady) return;
    engine.play();
    set({ isPlaying: true });
  },

  pause: () => {
    if (!engine) return;
    engine.pause();
    set({ isPlaying: false });
  },

  seek: (time) => {
    if (!engine || !get().isReady) return;
    engine.seek(time);
    set({ currentTime: time });
  },

  setVolume: (volume) => {
    if (!engine) return;
    const v = Math.max(0, Math.min(1, volume));
    engine.setVolume(v);
    set({ volume: v });
  },

  setPlaybackRate: (rate) => {
    if (!engine) return;
    const r = Math.max(0.25, Math.min(4, rate));
    engine.setPlaybackRate(r);
    set({ playbackRate: r });
  },

  setEffects: (partial) => {
    if (!engine) return;
    const next = { ...get().effects, ...partial };
    // Обновляем store сначала (reactive UI), затем применяем на движке
    set({ effects: next });
    engine.setEffects(next);
  },

  // Быстрая установка одного параметра (для слайдера)
  setEffect: (key, value) => {
    if (!engine) return;
    // Обновляем store (immutably)
    const next = { ...get().effects, [key]: value } as EffectSettings;
    set({ effects: next });
    // Применяем на движке одиночным вызовом (минимальная работа DSP)
    (engine as any).setEffect(key, value);
  },

  setRegion: (region) => {
    if (!engine) return;
    engine.setRegion(region);
    set({ region });
  },

  applyPreset: (preset) => {
    const { setEffects, setPlaybackRate } = get();
    switch (preset) {
      case "slowedReverb":
        setPlaybackRate(0.85);
        setEffects({
          reverbWet: 0.45,
          roomSize: 0.7,
          dampening: 2500,
          bassGain: 3,
          pitch: 0,
        });
        break;
      case "bassBoost":
        setPlaybackRate(1);
        setEffects({
          reverbWet: 0.1,
          roomSize: 0.4,
          dampening: 3500,
          bassGain: 8,
          pitch: 0,
        });
        break;
      case "nightcore":
        setPlaybackRate(1.25);
        setEffects({
          reverbWet: 0.15,
          roomSize: 0.5,
          dampening: 4000,
          bassGain: -1,
          pitch: 2,
        });
        break;
      default:
        setPlaybackRate(1);
        setEffects(DEFAULT_EFFECTS);
    }
  },

  getDuration: () => (engine ? engine.getDuration() : 0),
}));
