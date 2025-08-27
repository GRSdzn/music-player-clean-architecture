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
  private gain = new Tone.Gain(1).toDestination();
  private fadeGain = new Tone.Gain(1); // Добавляем fade контроллер
  private bass = new Tone.BiquadFilter({
    type: "lowshelf",
    frequency: 200,
    Q: 0.7,
    gain: 0,
  });
  private reverb = new Tone.Freeverb({
    roomSize: 0.3,
    dampening: 3000,
    wet: 0.2,
  });
  private pitch = new Tone.PitchShift({ pitch: 0 });
  private analyser = new Tone.Analyser("fft", 256);

  private player?: Tone.Player;
  private emitter = mitt<Events>();
  private raf?: number;
  private seekTimeout?: NodeJS.Timeout;
  private isSeeking = false; // Флаг для предотвращения конфликтов

  private duration = 0;
  private isPlaying = false;
  private offsetSec = 0;
  private startedAt = 0;
  private rate = 1;
  private region: Region | null = null;
  private effects: EffectSettings = {
    reverbWet: 0.2,
    roomSize: 0.3,
    dampening: 3000,
    bassGain: 0,
    pitch: 0,
  };

  constructor() {
    // Подключаем fadeGain в цепочку
    this.bass
      .connect(this.pitch)
      .connect(this.reverb)
      .connect(this.fadeGain)
      .connect(this.gain);
    this.gain.connect(this.analyser);
    this.setEffects(this.effects);
  }

  async load(buffer: ArrayBuffer) {
    await Tone.start();
    if (this.player) {
      this.stopInternal();
      this.player.dispose();
    }

    this.player = new Tone.Player({ autostart: false }).connect(this.bass);
    const url = URL.createObjectURL(new Blob([buffer]));
    try {
      await this.player.load(url);
      this.duration = this.player.buffer?.duration ?? 0;
      this.offsetSec = 0;
      this.applyRate(this.rate);
      this.setEffects(this.effects);
      this.region = null;
      this.emitter.emit("ready", this.duration);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  pause() {
    if (!this.player || !this.isPlaying) return;
    this.offsetSec = this.getCurrentTime();
    this.stopInternal();
  }

  // Улучшенный метод seek с защитой от конфликтов
  async seek(time: number) {
    if (!this.player || this.isSeeking) return;

    this.isSeeking = true;

    // Очищаем предыдущий timeout
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
    }

    const newOffset = this.clampToRegion(time);
    this.offsetSec = newOffset;
    const wasPlaying = this.isPlaying;

    if (wasPlaying) {
      // Плавное затухание перед seek
      this.fadeGain.gain.rampTo(0, 0.02);

      await new Promise((resolve) => {
        this.seekTimeout = setTimeout(() => {
          if (!this.player) {
            this.isSeeking = false;
            resolve(void 0);
            return;
          }

          this.stopInternal(false);

          // Запускаем с новой позиции
          this.player.start(undefined, this.offsetSec);
          this.startedAt = Tone.now();
          this.isPlaying = true;

          // Плавное нарастание после seek
          this.fadeGain.gain.value = 0;
          this.fadeGain.gain.rampTo(1, 0.02);

          this.loop();
          this.isSeeking = false;
          resolve(void 0);
        }, 25);
      });
    } else {
      this.isSeeking = false;
    }

    this.emitter.emit("time", this.offsetSec);
  }

  private stopInternal(resetFade = true) {
    if (this.isPlaying && this.player) {
      this.player.stop();
      if (resetFade) {
        this.fadeGain.gain.cancelScheduledValues(Tone.now());
        this.fadeGain.gain.value = 1;
      }
    }
    this.isPlaying = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = undefined;
    }
  }

  play() {
    if (!this.player || this.isPlaying || this.isSeeking) return;
    const startPos = this.clampToRegion(this.offsetSec);
    if (startPos >= this.duration) {
      this.offsetSec = this.duration;
      this.emitter.emit("ended");
      return;
    }

    this.stopInternal();

    // Плавный старт
    this.fadeGain.gain.value = 0;
    this.player.start(undefined, startPos);
    this.fadeGain.gain.rampTo(1, 0.05);
    this.startedAt = Tone.now();
    this.isPlaying = true;
    this.loop();
  }

  setVolume(volume: number) {
    this.gain.gain.value = clamp(volume, 0, 1);
  }

  setPlaybackRate(rate: number) {
    this.applyRate(rate);
  }

  setEffect<K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) {
    this.effects[key] = value;
    const mapping: Record<keyof EffectSettings, any> = {
      reverbWet: this.reverb,
      roomSize: this.reverb,
      dampening: this.reverb,
      bassGain: this.bass,
      pitch: this.pitch,
    };
    const node = mapping[key];
    if (node) {
      try {
        if ("value" in (node as any)[key]) {
          (node as any)[key].value = value;
        } else {
          (node as any)[key] = value;
        }
      } catch (e) {
        console.warn("setEffect error:", e);
      }
    }
  }

  setEffects(effects: EffectSettings) {
    for (const k in effects)
      this.setEffect(
        k as keyof EffectSettings,
        effects[k as keyof EffectSettings]
      );
  }

  setRegion(region: Region | null) {
    if (!this.duration) return;
    if (!region) {
      this.region = null;
      return;
    }
    this.region = {
      start: clamp(region.start, 0, this.duration),
      end: region.end ? clamp(region.end, 0, this.duration) : null,
      loop: !!region.loop,
    };
    if (this.isPlaying) {
      const now = this.getCurrentTime();
      if (now < this.region.start || (this.region.end && now > this.region.end))
        this.seek(this.region.start);
    }
  }

  getDuration() {
    return this.duration;
  }

  getCurrentTime() {
    return this.isPlaying
      ? this.offsetSec + (Tone.now() - this.startedAt) * this.rate
      : this.offsetSec;
  }

  onTimeUpdate(cb: (t: number) => void) {
    this.emitter.on("time", cb);
    return () => this.emitter.off("time", cb);
  }

  onEnded(cb: () => void) {
    this.emitter.on("ended", cb);
    return () => this.emitter.off("ended", cb);
  }

  getAnalyserData(): Float32Array {
    return this.analyser.getValue() as Float32Array;
  }

  private applyRate(rate: number) {
    this.rate = rate;
    if (this.player) (this.player as any).playbackRate = rate;
  }

  private loop() {
    const tick = () => {
      if (this.isSeeking) {
        this.raf = requestAnimationFrame(tick);
        return;
      }

      const time = this.getCurrentTime();
      const end = this.region?.end ?? this.duration;
      if (end && time >= end - 0.005) {
        if (this.region?.loop) this.seek(this.region.start);
        else {
          this.offsetSec = end;
          this.stopInternal();
          this.emitter.emit("ended");
          return;
        }
      }
      this.emitter.emit("time", time);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private clampToRegion(t: number) {
    if (!this.region) return clamp(t, 0, this.duration);
    return clamp(t, this.region.start, this.region.end ?? this.duration);
  }

  // Метод для очистки ресурсов
  dispose() {
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
    }
    this.stopInternal();
    if (this.player) {
      this.player.dispose();
    }
    this.fadeGain.dispose();
    this.bass.dispose();
    this.reverb.dispose();
    this.pitch.dispose();
    this.gain.dispose();
    this.analyser.dispose();
  }
}
