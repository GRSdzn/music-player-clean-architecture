import { create } from "zustand";
import {
  PlaybackState,
  AudioTrack,
  EffectSettings,
  Region,
} from "../../domain/entities";
import { ToneEngine } from "../../infrastructure/ToneEngine";

type PresetName = "slowedReverb" | "bassBoost" | "nightcore" | "default";

interface PlaybackStore extends PlaybackState {
  isReady: boolean;
  isLoading: boolean;
  engine: ToneEngine | null;

  initEngine: () => void;
  loadTrack: (track: AudioTrack) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;

  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;

  effects: EffectSettings;
  region: Region | null;

  setEffects: (effects: Partial<EffectSettings>) => void;
  setEffect: <K extends keyof EffectSettings>(
    key: K,
    value: EffectSettings[K]
  ) => void;
  setRegion: (region: Region | null) => void;
  applyPreset: (preset: PresetName) => void;

  getDuration: () => number;
  getEngine: () => ToneEngine | null;
}

const DEFAULT_EFFECTS: EffectSettings = {
  reverbWet: 0.2,
  roomSize: 0.3,
  dampening: 3000,
  bassGain: 0,
  pitch: 0,
};

export const usePlaybackStore = create<PlaybackStore>((set, get) => {
  let timeUpdateUnsub: (() => void) | null = null;
  let endedUnsub: (() => void) | null = null;
  let seekDebounceTimeout: NodeJS.Timeout | null = null;

  return {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    currentTrackId: null,

    isReady: false,
    isLoading: false,
    engine: null,
    effects: DEFAULT_EFFECTS,
    region: null,

    initEngine: () => set({ engine: get().engine || new ToneEngine() }),

    loadTrack: async (track) => {
      if (!get().engine) get().initEngine();
      const engine = get().engine!;
      timeUpdateUnsub?.();
      endedUnsub?.();

      // Очищаем debounce timeout при загрузке нового трека
      if (seekDebounceTimeout) {
        clearTimeout(seekDebounceTimeout);
        seekDebounceTimeout = null;
      }

      set({ isLoading: true, isReady: false, currentTrackId: track.id });

      try {
        await engine.load(track.buffer);
        engine.setEffects(get().effects);
        if (get().region) engine.setRegion(get().region);

        set({
          duration: engine.getDuration(),
          currentTime: 0,
          isPlaying: false,
          isReady: true,
          isLoading: false,
        });

        timeUpdateUnsub = engine.onTimeUpdate((time) =>
          set({ currentTime: time })
        );
        endedUnsub = engine.onEnded(() =>
          set({ isPlaying: false, currentTime: engine.getDuration() })
        );
      } catch (e) {
        set({ isLoading: false, isReady: false });
        throw e;
      }
    },

    play: () => {
      if (!get().engine || !get().isReady) return;
      get().engine?.play();
      set({ isPlaying: true });
    },

    pause: () => {
      get().engine?.pause();
      set({ isPlaying: false });
    },

    // Улучшенный seek с debouncing
    seek: (time) => {
      const engine = get().engine;
      if (!engine) return;

      // Синхронное обновление UI и engine
      set({ currentTime: time });
      engine.seek(time);
    },
    setVolume: (v) => {
      get().engine?.setVolume(Math.max(0, Math.min(1, v)));
      set({ volume: v });
    },

    setPlaybackRate: (r) => {
      get().engine?.setPlaybackRate(Math.max(0.25, Math.min(4, r)));
      set({ playbackRate: r });
    },

    setEffects: (partial) => {
      const next = { ...get().effects, ...partial };
      set({ effects: next });
      get().engine?.setEffects(next);
    },

    setEffect: (key, value) => {
      const next = { ...get().effects, [key]: value };
      set({ effects: next });
      get().engine?.setEffect(key, value);
    },

    setRegion: (region) => {
      get().engine?.setRegion(region);
      set({ region });
    },

    applyPreset: (preset) => {
      switch (preset) {
        case "slowedReverb":
          get().setPlaybackRate(0.85);
          get().setEffects({
            reverbWet: 0.45,
            roomSize: 0.7,
            dampening: 2500,
            bassGain: 3,
            pitch: 0,
          });
          break;
        case "bassBoost":
          get().setPlaybackRate(1);
          get().setEffects({
            reverbWet: 0.1,
            roomSize: 0.4,
            dampening: 3500,
            bassGain: 8,
            pitch: 0,
          });
          break;
        case "nightcore":
          get().setPlaybackRate(1.25);
          get().setEffects({
            reverbWet: 0.15,
            roomSize: 0.5,
            dampening: 4000,
            bassGain: -1,
            pitch: 2,
          });
          break;
        default:
          get().setPlaybackRate(1);
          get().setEffects(DEFAULT_EFFECTS);
      }
    },

    getDuration: () => get().engine?.getDuration() ?? 0,
    getEngine: () => get().engine,
  };
});
