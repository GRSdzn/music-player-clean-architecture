import { EffectSettings, Region } from "./entities";

export interface AudioEngineRepository {
  load(buffer: ArrayBuffer): Promise<void>;
  play(): void;
  pause(): void;
  seek(time: number): void;

  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;

  // Живые правки
  setEffects(effects: EffectSettings): void;
  setRegion(region: Region | null): void; // null = очистить регион

  getDuration(): number;
  getCurrentTime(): number;

  onTimeUpdate(callback: (time: number) => void): () => void;
  onEnded(callback: () => void): () => void;

  // Оффлайн-рендер для экспорта
  renderToWav(options?: { 
    region?: Region | null;
    effects?: EffectSettings;
    playbackRate?: number;
    volume?: number;
  }): Promise<Blob>;
}
