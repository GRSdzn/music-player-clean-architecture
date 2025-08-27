"use client";

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: SliderControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs text-muted-foreground font-mono">
          {value}
          {unit || ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer slider-control"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {min}
          {unit || ""}
        </span>
        <span>
          {max}
          {unit || ""}
        </span>
      </div>
    </div>
  );
}
