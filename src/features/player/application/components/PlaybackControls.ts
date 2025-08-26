import { AudioEngineRepository } from "../../domain/repositories";
import { EffectSettings } from "../../domain/entities";

export class PlaybackControls {
  constructor(private audioEngine: AudioEngineRepository) {}

  play(): void {
    this.audioEngine.play();
  }

  pause(): void {
    this.audioEngine.pause();
  }

  seek(time: number): void {
    this.audioEngine.seek(time);
  }

  setVolume(volume: number): void {
    // Валидация перенесена в store, здесь просто передаем значение
    this.audioEngine.setVolume(volume);
  }

  setPlaybackRate(rate: number): void {
    // Валидация перенесена в store, здесь просто передаем значение
    this.audioEngine.setPlaybackRate(rate);
  }

  setEffects(effects: EffectSettings): void {
    this.audioEngine.setEffects(effects);
  }

  // Методы для получения текущих значений из engine
  getCurrentTime(): number {
    return this.audioEngine.getCurrentTime();
  }

  getDuration(): number {
    return this.audioEngine.getDuration();
  }
}
