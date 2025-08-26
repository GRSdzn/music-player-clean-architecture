"use client";

import * as Tone from "tone";
import mitt from "mitt";
import { AudioEngineRepository } from "../domain/repositories";
import { EffectSettings } from "../domain/entities";

type Events = {
  time: number;
  ready: number;
  ended: void;
};

export class ToneEngine implements AudioEngineRepository {
  private gain = new Tone.Gain(1).toDestination();
  private reverb = new Tone.Reverb({ decay: 2, wet: 0 });
  private bass = new Tone.BiquadFilter({
    type: "lowshelf",
    frequency: 200,
    Q: 0.7,
    gain: 0,
  });
  private player?: Tone.Player;
  private emitter = mitt<Events>();

  private duration = 0;
  private isPlaying = false;
  private offsetSec = 0;
  private startedAt = 0;
  private raf?: number;
  private rate = 1;

  constructor() {
    this.bass.connect(this.reverb).connect(this.gain);
  }

  async load(buffer: ArrayBuffer): Promise<void> {
    await Tone.start();

    // Не трогаем плеер, если он ещё не инициализирован
    if (this.player && this.isPlaying) this.stopInternal();

    // Очищаем предыдущий плеер
    if (this.player) {
      this.player.dispose();
    }

    this.player = new Tone.Player({ autostart: false });
    this.player.connect(this.bass);

    const blob = new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    try {
      console.log("ToneEngine: Loading audio from blob:", url);
      await this.player.load(url); // дождёмся загрузки
      this.duration = this.player.buffer.duration;
      this.offsetSec = 0;
      this.applyRate(this.rate); // применяем скорость, если задана
      this.emitter.emit("ready", this.duration);
      console.log("ToneEngine: Audio loaded successfully");
    } catch (error) {
      console.error("ToneEngine: Failed to load audio:", error);
      throw error;
    } finally {
      URL.revokeObjectURL(url);
      console.log("ToneEngine: Blob URL revoked:", url);
    }
  }

  play(): void {
    if (!this.player || !this.player.buffer) return; // проверяем готовность
    if (this.isPlaying) return;

    this.startedAt = Tone.now();
    this.player.start(undefined, this.offsetSec);
    this.isPlaying = true;
    this.loop();
  }

  pause(): void {
    if (!this.player || !this.isPlaying) return;
    this.offsetSec = this.getCurrentTime();
    this.stopInternal();
  }

  seek(time: number): void {
    if (!this.player) return;
    this.offsetSec = Math.max(0, Math.min(time, this.duration || time));
    if (this.isPlaying) {
      this.player.stop();
      this.startedAt = Tone.now();
      this.player.start(undefined, this.offsetSec);
    }
    this.emitter.emit("time", this.offsetSec);
  }

  setVolume(volume: number): void {
    this.gain.gain.value = volume;
  }

  setPlaybackRate(rate: number): void {
    this.applyRate(rate);
  }

  setEffects(effects: EffectSettings): void {
    this.reverb.wet.value = effects.reverbWet;
    this.bass.gain.value = effects.bassGain;
  }

  getDuration(): number {
    return this.duration;
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return this.offsetSec;
    return this.offsetSec + (Tone.now() - this.startedAt) * this.rate;
  }

  onTimeUpdate(callback: (time: number) => void): () => void {
    this.emitter.on("time", callback);
    return () => this.emitter.off("time", callback);
  }

  onEnded(callback: () => void): () => void {
    this.emitter.on("ended", callback);
    return () => this.emitter.off("ended", callback);
  }

  private applyRate(rate: number): void {
    if (!this.player) {
      this.rate = rate;
      return;
    }

    // Если играет — фиксируем текущее время и начинаем отсчёт заново
    if (this.isPlaying) {
      this.offsetSec = this.getCurrentTime();
      this.startedAt = Tone.now();
    }

    this.rate = rate;
    this.player.playbackRate = rate;
  }

  private loop(): void {
    const tick = () => {
      const time = this.getCurrentTime();
      this.emitter.emit("time", time);
      if (this.duration && time >= this.duration) {
        this.offsetSec = this.duration;
        this.stopInternal();
        this.emitter.emit("ended");
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopInternal(): void {
    if (this.isPlaying && this.player) {
      this.player.stop();
      this.isPlaying = false;
    }
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}
