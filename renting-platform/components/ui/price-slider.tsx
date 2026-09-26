"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface PriceSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  valueText?: string;
  className?: string;
  marks?: number[];
}

/** Accessible range slider (Radix) with a glass thumb. */
export function PriceSlider({ value, min, max, step = 1, onChange, label, valueText, className, marks }: PriceSliderProps) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className={cn("relative", className)}>
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => next !== undefined && onChange(next)}
        className="relative flex h-7 w-full touch-none select-none items-center"
        aria-label={label}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[linear-gradient(90deg,#0a84ff,#5ab0ff)]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-valuetext={valueText}
          className="block size-6 rounded-full border border-white/40 bg-[linear-gradient(180deg,#ffffff,#d9dbe1)] shadow-[0_2px_10px_rgb(0_0_0/0.5),0_0_0_4px_rgb(10_132_255/0.18)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 active:scale-110"
        />
      </SliderPrimitive.Root>
      {marks && (
        <div className="pointer-events-none relative mt-1 h-3" aria-hidden="true">
          {marks.map((mark) => (
            <span key={mark} className="absolute top-0 h-1 w-px -translate-x-1/2 bg-white/20" style={{ left: `${pct(mark)}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}
