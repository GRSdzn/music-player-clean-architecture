"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlaybackStore } from "../../application/store/playbackStore";

export function BackgroundVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const getEngine = usePlaybackStore((s) => s.getEngine);
  const isReady = usePlaybackStore((s) => s.isReady);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const [opacity, setOpacity] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Мемоизированные константы
  const visualizerConfig = useMemo(
    () => ({
      barCount: 120,
      barSpacing: 0.5,
      fadeSpeed: 0.02,
      fadeOutSpeed: 0.03,
      minActivity: 0.25,
      heightMultiplier: 0.8,
      sensitivityBoost: 140,
    }),
    []
  );

  // Оптимизированное управление opacity с requestAnimationFrame
  const animateOpacity = useCallback(
    (targetOpacity: number, speed: number) => {
      const animate = (currentTime: number) => {
        if (currentTime - lastTimeRef.current >= 16) {
          // ~60fps
          setOpacity((prev) => {
            const diff = targetOpacity - prev;
            if (Math.abs(diff) < 0.01) {
              return targetOpacity;
            }
            return prev + Math.sign(diff) * speed;
          });
          lastTimeRef.current = currentTime;
        }

        if (opacity !== targetOpacity) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    },
    [opacity]
  );

  // Управление плавными переходами
  useEffect(() => {
    if (isPlaying && isReady) {
      animateOpacity(1, visualizerConfig.fadeSpeed);
    } else {
      animateOpacity(0, visualizerConfig.fadeOutSpeed);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isReady, animateOpacity, visualizerConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let displayWidth: number;
    let displayHeight: number;
    let barWidth: number;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";

      // Кешируем размеры
      displayWidth = canvas.width / window.devicePixelRatio;
      displayHeight = canvas.height / window.devicePixelRatio;
      barWidth = Math.max(
        1,
        (displayWidth -
          (visualizerConfig.barCount - 1) * visualizerConfig.barSpacing) /
          visualizerConfig.barCount
      );
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let drawAnimationId: number | null = null;

    // Предвычисленные значения для волн (используем Float32Array для оптимизации)
    const waveOffsets = new Float32Array(visualizerConfig.barCount);
    const baseWaveOffsets = new Float32Array(visualizerConfig.barCount);

    for (let i = 0; i < visualizerConfig.barCount; i++) {
      waveOffsets[i] = i * 0.2;
      baseWaveOffsets[i] = i * 0.15;
    }

    // Исправлен тип параметра data на Uint8Array
    const drawBars = (data: Uint8Array | null, timeOffset: number) => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      if (!data || !isReady || !isPlaying) {
        // Базовая линия
        ctx.fillStyle = `rgba(156, 163, 175, ${0.3 * opacity})`;
        for (let i = 0; i < visualizerConfig.barCount; i++) {
          const x = i * (barWidth + visualizerConfig.barSpacing);
          const baseHeight = 1 + Math.sin(i * 0.1) * 0.5;
          ctx.fillRect(x, displayHeight - baseHeight, barWidth, baseHeight);
        }
        return;
      }

      const fftLength = data.length;
      const samplesPerBar = Math.max(
        1,
        Math.floor(fftLength / visualizerConfig.barCount)
      );

      // Предвычисляем общую энергию
      let totalEnergy = 0;
      for (let i = 0; i < fftLength; i++) {
        totalEnergy += data[i];
      }
      const avgEnergy = totalEnergy / fftLength;

      // Предвычисляем волновые значения
      const waveBoost = 0.2 + 0.1 * Math.sin(timeOffset * 3);
      const secondWave = 0.1 * Math.sin(timeOffset * 1.5);
      const minActivityBase =
        visualizerConfig.minActivity + Math.sin(timeOffset * 2) * 0.1;

      for (let i = 0; i < visualizerConfig.barCount; i++) {
        const baseIndex = Math.floor(
          (i / visualizerConfig.barCount) * fftLength
        );

        // Оптимизированный сбор данных
        let sum = 0;
        let sampleCount = 0;

        // Основная частота
        const endIndex = Math.min(baseIndex + samplesPerBar, fftLength);
        for (let j = baseIndex; j < endIndex; j++) {
          sum += data[j];
          sampleCount++;
        }

        // Низкие частоты (оптимизировано)
        const lowFreqIndex = Math.floor(i * 0.1);
        if (lowFreqIndex < fftLength) {
          sum += data[lowFreqIndex] * 0.5;
          sampleCount += 0.5;
        }

        // Высокие частоты (оптимизировано)
        const highFreqIndex = Math.floor(
          fftLength * 0.7 + (i / visualizerConfig.barCount) * fftLength * 0.3
        );
        if (highFreqIndex < fftLength) {
          sum += data[highFreqIndex] * 0.3;
          sampleCount += 0.3;
        }

        // Общая энергия
        sum += avgEnergy * 0.2;
        sampleCount += 0.2;

        const value = sampleCount > 0 ? sum / sampleCount : 0;
        const normalizedValue =
          (value + visualizerConfig.sensitivityBoost) /
          visualizerConfig.sensitivityBoost;

        // Предвычисленные волны
        const waveValue = waveBoost + Math.sin(waveOffsets[i]) * 0.1;
        const secondWaveValue = secondWave + Math.sin(baseWaveOffsets[i]) * 0.1;
        const minActivity =
          minActivityBase + Math.sin(baseWaveOffsets[i]) * 0.1;

        const finalValue = Math.max(
          normalizedValue + waveValue + secondWaveValue,
          minActivity
        );
        const barHeight = Math.max(
          4,
          finalValue * displayHeight * visualizerConfig.heightMultiplier
        );

        const x = i * (barWidth + visualizerConfig.barSpacing);
        const y = displayHeight - barHeight;

        // Оптимизированный цвет
        const baseAlpha = Math.min(0.85, finalValue * 0.6 + 0.4) * opacity;
        const hue =
          90 +
          (i / visualizerConfig.barCount) * 120 +
          Math.sin(timeOffset + i * 0.1) * 20;
        const saturation = 50 + finalValue * 30;
        const lightness = 45 + finalValue * 25;

        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${baseAlpha})`;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    const draw = () => {
      const engine = getEngine();
      const timeOffset = Date.now() * 0.001;
      const data = engine?.getAnalyserData() || null; // Возвращает Uint8Array | null

      drawBars(data as Uint8Array | null, timeOffset);
      drawAnimationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (drawAnimationId) cancelAnimationFrame(drawAnimationId);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [getEngine, isReady, isPlaying, opacity, visualizerConfig]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full transition-opacity duration-300"
      style={{
        filter: "blur(0.5px)",
        opacity: opacity,
      }}
    />
  );
}
