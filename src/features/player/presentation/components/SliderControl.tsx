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

// Функция для округления значений
function formatValue(value: number, step: number): string {
  // Определяем количество знаков после запятой на основе step
  const decimals = step >= 1 ? 0 : step.toString().split('.')[1]?.length || 0;
  return value.toFixed(decimals);
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
          {formatValue(value, step)}
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
          {formatValue(min, step)}
          {unit || ""}
        </span>
        <span>
          {formatValue(max, step)}
          {unit || ""}
        </span>
      </div>
    </div>
  );
}
