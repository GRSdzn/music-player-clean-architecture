import { AudioTrack, EffectSettings } from "./entities";

export interface AudioEngineRepository {
  load(buffer: ArrayBuffer): Promise<void>;
  play(): void;
  pause(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  setEffects(effects: EffectSettings): void;
  getDuration(): number;
  getCurrentTime(): number;
  onTimeUpdate(callback: (time: number) => void): () => void;
  onEnded(callback: () => void): () => void;
}
