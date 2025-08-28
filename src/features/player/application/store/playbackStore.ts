import { create } from 'zustand';
import { PlaybackState, AudioTrack, EffectSettings, Region } from '../../domain/entities';
import { ToneEngine } from '../../infrastructure/ToneEngine';

type PresetName = 'slowedReverb' | 'bassBoost' | 'nightcore' | 'default';

// Расширяем PlaybackState дополнительными свойствами для store
interface PlaybackStore extends PlaybackState {
  isReady: boolean;
  isLoading: boolean;
  engine: ToneEngine | null;
  effects: EffectSettings;
  region: Region | null;

  initEngine: () => void;
  loadTrack: (track: AudioTrack) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;

  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;

  setEffects: (effects: Partial<EffectSettings>) => void;
  setEffect: <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => void;
  setRegion: (region: Region | null) => void;
  applyPreset: (preset: PresetName) => void;

  getDuration: () => number;
  getEngine: () => ToneEngine | null;
  exportTrack: (filename?: string) => Promise<void>;
}

const DEFAULT_EFFECTS: EffectSettings = {
  reverbWet: 0.3,    // Увеличено
  roomSize: 0.5,     // Увеличено
  dampening: 2000,   // Уменьшено для яркости
  bassGain: 0,
  pitch: 0,
};

// Переменные для отписки от событий
let timeUpdateUnsub: (() => void) | undefined;
let endedUnsub: (() => void) | undefined;

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Базовые свойства PlaybackState
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  currentTrackId: null,

  // Дополнительные свойства store
  isReady: false,
  isLoading: false,
  engine: null,
  effects: DEFAULT_EFFECTS,
  region: null,

  initEngine: () => {
    const currentEngine = get().engine;
    if (!currentEngine) {
      set({ engine: new ToneEngine() });
    }
  },

  exportTrack: async (filename?: string) => {
    const engine = get().engine;
    const { currentTrackId } = get();
    
    if (!engine || !currentTrackId) {
      throw new Error('No track loaded');
    }

    try {
      const blob = await engine.renderToWav({
        region: get().region,
        effects: get().effects,
        playbackRate: get().playbackRate,
        volume: get().volume,
      });

      // Скачиваем файл
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `track_${currentTrackId}_with_effects.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  },

  loadTrack: async (track) => {
    if (!get().engine) get().initEngine();
    const engine = get().engine!;
    
    // Отписываемся от предыдущих событий
    timeUpdateUnsub?.();
    endedUnsub?.();

    set({ isLoading: true, currentTrackId: track.id });

    try {
      await engine.load(track.buffer);
      
      // Подписываемся на события
      timeUpdateUnsub = engine.onTimeUpdate((time) => {
        set({ currentTime: time });
      });
      
      endedUnsub = engine.onEnded(() => {
        set({ isPlaying: false, currentTime: get().duration });
      });
      
      set({ 
        duration: engine.getDuration(),
        isReady: true,
        isLoading: false,
        currentTime: 0
      });
    } catch (error) {
      console.error('Failed to load track:', error);
      set({ isLoading: false, isReady: false });
      throw error;
    }
  },

  play: () => {
    if (!get().engine || !get().isReady) return;
    
    try {
      get().engine?.play();
      set({ isPlaying: true });
    } catch (error) {
      console.error('Playback failed:', error);
      // Можно показать уведомление пользователю
      if (error instanceof Error && error.message.includes('пользовательское взаимодействие')) {
        // Показать пользователю сообщение о необходимости клика
        alert('Для воспроизведения аудио необходимо взаимодействие с страницей. Попробуйте еще раз.');
      }
    }
  },

  pause: () => {
    get().engine?.pause();
    set({ isPlaying: false });
  },

  seek: (time) => {
    const engine = get().engine;
    if (!engine) return;
    engine.seek(time);
    set({ currentTime: time });
  },

  setVolume: (v) => {
    const volume = Math.max(0, Math.min(1, v));
    get().engine?.setVolume(volume);
    set({ volume });
  },

  setPlaybackRate: (r) => {
    const rate = Math.max(0.25, Math.min(4, r));
    get().engine?.setPlaybackRate(rate);
    set({ playbackRate: rate });
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
      case 'slowedReverb':
        get().setPlaybackRate(0.85);
        get().setEffects({
          reverbWet: 0.45,
          roomSize: 0.7,
          dampening: 2500,
          bassGain: 3,
          pitch: 0,
        });
        break;
      case 'bassBoost':
        get().setPlaybackRate(1);
        get().setEffects({
          reverbWet: 0.1,
          roomSize: 0.4,
          dampening: 3500,
          bassGain: 8,
          pitch: 0,
        });
        break;
      case 'nightcore':
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
}));
