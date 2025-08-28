/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as Tone from 'tone';
import mitt from 'mitt';
import { AudioEngineRepository } from '../domain/repositories';
import { EffectSettings, Region } from '../domain/entities';

type Events = {
  time: number;
  ready: number;
  ended: void;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export class ToneEngine implements AudioEngineRepository {
  private gain = new Tone.Gain(1).toDestination();
  private fadeGain = new Tone.Gain(1);
  private bass = new Tone.BiquadFilter({
    type: 'lowshelf',
    frequency: 200,
    Q: 0.7,
    gain: 0,
  });
  // Упрощенная конфигурация reverb для более заметного эффекта
  private reverb = new Tone.Freeverb({
    roomSize: 0.5, // Увеличено с 0.3
    dampening: 2000, // Уменьшено с 3000 для более яркого звука
    wet: 0.4, // Увеличено с 0.2
  });
  // Исправленная конфигурация PitchShift - только поддерживаемые параметры
  private pitch = new Tone.PitchShift({
    pitch: 0, // Только этот параметр поддерживается
  });
  private analyser = new Tone.Analyser('fft', 256);

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
    reverbWet: 0.4, //
    roomSize: 0.5,
    dampening: 2000,
    bassGain: 0,
    pitch: 0,
  };
  private isAudioContextStarted = false;

  constructor() {
    this.bass.connect(this.pitch).connect(this.reverb).connect(this.fadeGain).connect(this.gain);
    this.gain.connect(this.analyser);
    this.setEffects(this.effects);
  }

  private async ensureAudioContextStarted() {
    if (Tone.getContext().state !== 'running') {
      try {
        await Tone.start();
      } catch {
        // Игнорируем ошибку, если контекст уже запущен
      }
    }
  }

  async load(buffer: ArrayBuffer) {
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
      this.emitter.emit('ready', this.duration);
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

    this.emitter.emit('time', this.offsetSec);
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

  async play() {
    if (!this.player || this.isPlaying || this.isSeeking) return;

    // Запускаем AudioContext только при первом воспроизведении
    await this.ensureAudioContextStarted();

    const startPos = this.clampToRegion(this.offsetSec);
    if (startPos >= this.duration) {
      this.offsetSec = this.duration;
      this.emitter.emit('ended');
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
        // Специальная обработка для более заметных эффектов
        if (key === 'reverbWet') {
          // Используем квадратичную кривую для более драматичного изменения
          const wetValue = Math.pow(value as number, 0.7);
          this.reverb.wet.value = clamp(wetValue, 0, 0.8);
        } else if (key === 'pitch') {
          // Расширяем диапазон pitch до ±2 октав
          const pitchValue = clamp(value as number, -24, 24);
          this.pitch.pitch = pitchValue;
        } else {
          // Стандартная обработка для других эффектов
          const nodeProperty = (node as any)[key];
          if (nodeProperty && typeof nodeProperty === 'object' && 'value' in nodeProperty) {
            nodeProperty.value = value;
          } else {
            (node as any)[key] = value;
          }
        }
      } catch (e) {
        console.warn('setEffect error:', e);
      }
    }
  }

  setEffects(effects: EffectSettings) {
    for (const k in effects) this.setEffect(k as keyof EffectSettings, effects[k as keyof EffectSettings]);
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
      if (now < this.region.start || (this.region.end && now > this.region.end)) this.seek(this.region.start);
    }
  }

  getDuration() {
    return this.duration;
  }

  getCurrentTime() {
    return this.isPlaying ? this.offsetSec + (Tone.now() - this.startedAt) * this.rate : this.offsetSec;
  }

  onTimeUpdate(cb: (t: number) => void) {
    this.emitter.on('time', cb);
    return () => this.emitter.off('time', cb);
  }

  onEnded(cb: () => void) {
    this.emitter.on('ended', cb);
    return () => this.emitter.off('ended', cb);
  }

  getAnalyserData(): Float32Array {
    return this.analyser.getValue() as Float32Array;
  }

  private applyRate(rate: number) {
    this.rate = rate;
    if (this.player) {
      const playerWithRate = this.player as { playbackRate: number };
      playerWithRate.playbackRate = rate;
    }
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
          this.emitter.emit('ended');
          return;
        }
      }
      this.emitter.emit('time', time);
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

  // Метод для экспорта трека с эффектами
  async renderToWav(options?: { region?: Region | null; effects?: EffectSettings; playbackRate?: number; volume?: number }): Promise<Blob> {
    if (!this.player?.buffer) {
      throw new Error('No audio loaded');
    }

    const opts = {
      region: options?.region || this.region,
      effects: options?.effects || this.effects,
      playbackRate: options?.playbackRate || this.rate,
      volume: options?.volume || this.gain.gain.value,
    };

    // Определяем длительность и начальную/конечную позицию
    const startTime = opts.region?.start || 0;
    const endTime = opts.region?.end || this.duration;
    const renderDuration = (endTime - startTime) / opts.playbackRate;

    // Создаем оффлайн контекст для рендеринга
    const sampleRate = 44100;
    const channels = 2;
    const offlineContext = new OfflineAudioContext(channels, Math.ceil(renderDuration * sampleRate), sampleRate);

    try {
      // Создаем источник звука
      const source = offlineContext.createBufferSource();
      source.buffer = this.player.buffer.get() as AudioBuffer;
      source.playbackRate.value = opts.playbackRate;

      // Создаем эффекты используя нативные Web Audio API узлы
      const gainNode = offlineContext.createGain();
      gainNode.gain.value = opts.volume;

      // Bass filter
      const bassFilter = offlineContext.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200;
      bassFilter.Q.value = 0.7;
      bassFilter.gain.value = opts.effects.bassGain;

      // Простой reverb через ConvolverNode (упрощенная версия)
      const convolver = offlineContext.createConvolver();
      const impulseBuffer = this.createReverbImpulse(offlineContext, opts.effects);
      convolver.buffer = impulseBuffer;

      const dryGain = offlineContext.createGain();
      const wetGain = offlineContext.createGain();
      dryGain.gain.value = 1 - opts.effects.reverbWet;
      wetGain.gain.value = opts.effects.reverbWet;

      const merger = offlineContext.createChannelMerger(2);

      // Подключаем цепочку эффектов
      source.connect(bassFilter);

      // Dry path
      bassFilter.connect(dryGain);
      dryGain.connect(merger, 0, 0);
      dryGain.connect(merger, 0, 1);

      // Wet path (reverb)
      bassFilter.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(merger, 0, 0);
      wetGain.connect(merger, 0, 1);

      merger.connect(gainNode);
      gainNode.connect(offlineContext.destination);

      // Запускаем рендеринг
      source.start(0, startTime, endTime - startTime);

      const renderedBuffer = await offlineContext.startRendering();

      // Конвертируем в WAV
      return this.audioBufferToWav(renderedBuffer);
    } catch (error) {
      console.error('Render error:', error);
      throw new Error('Failed to render audio: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // Создание импульсной характеристики для reverb
  private createReverbImpulse(context: OfflineAudioContext, effects: EffectSettings): AudioBuffer {
    const length = context.sampleRate * 2; // 2 секунды
    const impulse = context.createBuffer(2, length, context.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, effects.roomSize * 3);
        const noise = (Math.random() * 2 - 1) * decay;
        channelData[i] = noise;
      }
    }

    return impulse;
  }

  // Вспомогательный метод для конвертации AudioBuffer в WAV
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}
