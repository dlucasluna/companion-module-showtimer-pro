"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  /** Seconds. Kept short so the number feels responsive during a conversation. */
  duration?: number;
  className?: string;
}

/**
 * Smoothly counts from the previous value to the new one (259 → 319).
 * Renders the final value on the server and for reduced-motion users.
 */
export function AnimatedNumber({ value, format, duration = 0.5, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      setDisplay(value);
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={className}>
      {/* Screen readers get the final value only, never the intermediate frames. */}
      <span className="num" aria-hidden="true">
        {format(display)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
