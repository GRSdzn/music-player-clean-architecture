"use client";

import * as Tone from "tone";
import mitt from "mitt";
import { AudioEngineRepository } from "../domain/repositories";
import { EffectSettings, Region } from "../domain/entities";

type Events = {
  time: number;
  ready: number;
  ended: void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export class ToneEngine implements AudioEngineRepository {
  // Узлы
  private gain = new Tone.Gain(1).toDestination();
  private bass = new Tone.BiquadFilter({
    type: "lowshelf",
    frequency: 200,
    Q: 0.7,
    gain: 0,
  });

  // Реалтайм-дружественный реверб + питч
  // Freeverb даёт быстрые изменения в реальном времени
  private reverb = new Tone.Freeverb({
    roomSize: 0.3,
    dampening: 3000,
    wet: 0.2,
  });
  private pitch = new Tone.PitchShift({ pitch: 0 });

  private player?: Tone.Player;
  private emitter = mitt<Events>();

  // Состояние
  private duration = 0;
  private isPlaying = false;
  private offsetSec = 0;
  private startedAt = 0;
  private raf?: number;
  private rate = 1;

  // Регион (обрезка/луп)
  private region: Region | null = null;

  // Текущие эффекты (для идемпотентности)
  private effects: EffectSettings = {
    reverbWet: 0.2,
    roomSize: 0.3,
    dampening: 3000,
    bassGain: 0,
    pitch: 0,
  };

  constructor() {
    // Цепочка: Player -> Bass -> Pitch -> Reverb -> Gain -> Out
    // порядок: фильтр(низкие) -> питч -> реверб -> громкость -> выход
    this.bass.connect(this.pitch).connect(this.reverb).connect(this.gain);
  }

  // --------------------
  // Public API
  // --------------------
  async load(buffer: ArrayBuffer): Promise<void> {
    await Tone.start();

    if (this.player && this.isPlaying) this.stopInternal();
    if (this.player) {
      this.player.dispose();
      this.player = undefined;
    }

    this.player = new Tone.Player({ autostart: false });
    this.player.connect(this.bass);

    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);

    try {
      await this.player.load(url);
      this.duration = this.player.buffer?.duration ?? 0;
      this.offsetSec = 0;
      // Применяем текущую скорость и эффекты (без лишних пересозданий)
      this.applyRate(this.rate);
      this.applyEffects(this.effects);
      this.region = null;
      this.emitter.emit("ready", this.duration);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  play(): void {
    if (!this.player || !this.player.buffer) return;
    if (this.isPlaying) return;

    this.startedAt = Tone.now();

    const startPos = this.clampToRegion(this.offsetSec);
    // защитное поведение: если startPos больше duration — не стартуем
    if (this.duration && startPos >= this.duration) {
      this.offsetSec = this.duration;
      this.emitter.emit("ended");
      return;
    }

    this.player.start(undefined, startPos);
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
    this.offsetSec = this.clampToRegion(time);
    if (this.isPlaying) {
      this.player.stop();
      this.startedAt = Tone.now();
      this.player.start(undefined, this.offsetSec);
    }
    this.emitter.emit("time", this.offsetSec);
  }

  setVolume(volume: number): void {
    this.gain.gain.value = clamp(volume, 0, 1);
  }

  setPlaybackRate(rate: number): void {
    this.applyRate(rate);
  }

  // Устанавливает только один параметр — чтобы UI-слайдеры были плавными
  setEffect<K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) {
    (this.effects as any)[key] = value;

    switch (key) {
      case "reverbWet":
        this.setSignalOrProp(this.reverb, "wet", value as number);
        break;
      case "roomSize":
        this.setSignalOrProp(this.reverb, "roomSize", value as number);
        break;
      case "dampening":
        this.setSignalOrProp(this.reverb, "dampening", value as number);
        break;
      case "bassGain":
        this.setSignalOrProp(this.bass, "gain", value as number);
        break;
      case "pitch":
        this.setSignalOrProp(this.pitch, "pitch", value as number);
        break;
    }
  }

  // Устанавливает сразу объект эффектов — делегируем по-ключам
  setEffects(effects: EffectSettings): void {
    // Применяем только те ключи, что реально изменились
    for (const key of Object.keys(effects) as (keyof EffectSettings)[]) {
      this.setEffect(key, effects[key]);
    }
  }

  setRegion(region: Region | null): void {
    if (!this.duration) {
      this.region = null;
      return;
    }
    if (!region) {
      this.region = null;
      return;
    }

    const start = clamp(region.start, 0, this.duration);
    const end =
      region.end === null ? null : clamp(region.end, start, this.duration);

    this.region = { start, end, loop: !!region.loop };

    // Если в момент установки мы уже вне диапазона — подсекнемся
    const now = this.getCurrentTime();
    if (this.isPlaying && (now < start || (end !== null && now > end))) {
      this.seek(start);
    }
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

  // --------------------
  // Internal helpers
  // --------------------
  private applyRate(rate: number): void {
    if (!this.player) {
      this.rate = rate;
      return;
    }
    if (this.isPlaying) {
      this.offsetSec = this.getCurrentTime();
      this.startedAt = Tone.now();
    }
    this.rate = rate;
    // Tone.Player uses playbackRate
    (this.player as any).playbackRate = rate;
  }

  private applyEffects(e: EffectSettings): void {
    // Применяем через setEffect чтобы использовался один и тот же код
    this.setEffects(e);
  }

  // Устанавливает свойство node[prop] = value или node[prop].value = value
  // в зависимости от того, что доступно (Signal vs primitive)
  private setSignalOrProp(node: any, prop: string, value: number) {
    try {
      const target = node[prop];
      if (target && typeof target === "object" && "value" in target) {
        target.value = value;
      } else if (target !== undefined) {
        node[prop] = value;
      } else {
        (node as any)[prop] = value;
      }
    } catch (e) {}
  }

  private clampToRegion(t: number): number {
    if (!this.region) {
      return clamp(t, 0, this.duration || t);
    }
    const start = this.region.start;
    const end = this.region.end ?? this.duration;
    return clamp(t, start, end);
  }

  private loop(): void {
    let lastEmitTime = 0;
    const EMIT_INTERVAL = 100; // Обновлять время только каждые 100мс

    const tick = () => {
      const time = this.getCurrentTime();
      const now = performance.now();

      // Эмитим время только с ограниченной частотой
      if (now - lastEmitTime >= EMIT_INTERVAL) {
        this.emitter.emit("time", time);
        lastEmitTime = now;
      }

      const end = this.region?.end ?? this.duration;

      if (end && time >= end - 0.005) {
        if (this.region?.loop) {
          const start = this.region.start;
          this.offsetSec = start;
          if (this.player) {
            this.player.stop();
            this.startedAt = Tone.now();
            this.player.start(undefined, start);
          }
          this.raf = requestAnimationFrame(tick);
          return;
        } else {
          this.offsetSec = end;
          this.stopInternal();
          this.emitter.emit("ended");
          return;
        }
      }

      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopInternal(): void {
    if (this.isPlaying && this.player) {
      try {
        this.player.stop();
      } catch {
        // ignore
      }
      this.isPlaying = false;
    }
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}
