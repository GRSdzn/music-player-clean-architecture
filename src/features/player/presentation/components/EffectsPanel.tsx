"use client";

import { useShallow } from "zustand/react/shallow";
import { usePlaybackStore } from "../../application/store/playbackStore";
import { SliderControl } from "./SliderControl";

export default function EffectsPanel() {
  const { effects, playbackRate, setEffect, setPlaybackRate, applyPreset } =
    usePlaybackStore(
      useShallow((s) => ({
        effects: s.effects,
        playbackRate: s.playbackRate,
        setEffect: s.setEffect,
        setPlaybackRate: s.setPlaybackRate,
        applyPreset: s.applyPreset,
      }))
    );

  return (
    <div className="p-4 space-y-4 bg-card border border-border rounded-lg">
      {/* Заголовок */}
      <div className="pb-2 border-b border-border">
        <h2 className="text-lg font-medium text-foreground">Audio Effects</h2>
        <p className="text-sm text-muted-foreground">
          Настройте звучание в реальном времени
        </p>
      </div>

      {/* Playback Rate */}
      <SliderControl
        label="Скорость"
        value={playbackRate}
        min={0.25}
        max={2}
        step={0.01}
        unit="x"
        onChange={setPlaybackRate}
      />

      {/* Reverb */}
      <div className="space-y-3 p-3 bg-muted/50 rounded-md">
        <h3 className="text-sm font-medium text-foreground">Reverb</h3>
        <SliderControl
          label="Wet Level"
          value={effects.reverbWet * 100}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => setEffect("reverbWet", v / 100)}
        />
        <SliderControl
          label="Room Size"
          value={effects.roomSize * 100}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => setEffect("roomSize", v / 100)}
        />
        <SliderControl
          label="Dampening"
          value={effects.dampening}
          min={500}
          max={10000}
          step={100}
          unit=" Hz"
          onChange={(v) => setEffect("dampening", v)}
        />
      </div>

      {/* Bass */}
      <SliderControl
        label="Bass Gain"
        value={effects.bassGain}
        min={-10}
        max={10}
        step={0.5}
        unit=" dB"
        onChange={(v) => setEffect("bassGain", v)}
      />

      {/* Pitch */}
      <SliderControl
        label="Pitch Shift"
        value={effects.pitch}
        min={-12}
        max={12}
        step={1}
        unit=" st"
        onChange={(v) => setEffect("pitch", v)}
      />

      {/* Presets */}
      <div className="space-y-3 pt-2 border-t border-border">
        <h3 className="text-sm font-medium text-foreground">Пресеты</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => applyPreset("slowedReverb")}
            className="px-3 py-2 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Slowed + Reverb
          </button>
          <button
            onClick={() => applyPreset("bassBoost")}
            className="px-3 py-2 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Bass Boost
          </button>
          <button
            onClick={() => applyPreset("nightcore")}
            className="px-3 py-2 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Nightcore
          </button>
          <button
            onClick={() => applyPreset("default")}
            className="px-3 py-2 text-xs font-medium bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
