"use client";

import { useState, type InputHTMLAttributes } from "react";
import { formatNumber } from "@/lib/formatters";
import { parseMoneyInput, parsePercentInput } from "@/lib/formatters/parse";
import { cn } from "@/lib/utils";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

interface MoneyInputProps extends BaseProps {
  /** Cents, or null for empty. */
  value: number | null;
  onCommit: (cents: number | null) => void;
  suffix?: string;
}

/** Text input for euro amounts. Commits on blur / Enter so typing never jumps. */
export function MoneyInput({ value, onCommit, suffix, className, ...props }: MoneyInputProps) {
  const format = (cents: number | null) => (cents === null ? "" : formatNumber(cents / 100, cents % 100 === 0 ? 0 : 2));
  const [text, setText] = useState(format(value));
  const [focused, setFocused] = useState(false);
  const [synced, setSynced] = useState(value);

  // Derived state: follow external value changes while the user is not typing.
  if (!focused && value !== synced) {
    setSynced(value);
    setText(format(value));
  }

  function commit() {
    const parsed = parseMoneyInput(text);
    onCommit(parsed);
    setText(format(parsed ?? value));
  }

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3">€</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className={cn(
          "num h-11 w-full rounded-control border border-white/10 bg-white/[0.045] pl-8 text-[0.9375rem] text-fg placeholder:text-fg-3 transition focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/15",
          suffix ? "pr-14" : "pr-3.5",
        )}
        {...props}
      />
      {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-small text-fg-3">{suffix}</span>}
    </div>
  );
}

interface PercentInputProps extends BaseProps {
  /** Fraction (0.3 = 30%). */
  value: number;
  onCommit: (fraction: number) => void;
  max?: number;
}

export function PercentInput({ value, onCommit, max = 1, className, ...props }: PercentInputProps) {
  const format = (fraction: number) => formatNumber(fraction * 100, (fraction * 100) % 1 === 0 ? 0 : 1);
  const [text, setText] = useState(format(value));
  const [focused, setFocused] = useState(false);
  const [synced, setSynced] = useState(value);

  if (!focused && value !== synced) {
    setSynced(value);
    setText(format(value));
  }

  function commit() {
    const parsed = parsePercentInput(text);
    if (parsed !== null) {
      const next = Math.min(max, parsed);
      onCommit(next);
      setText(format(next));
    } else setText(format(value));
  }

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="num h-11 w-full rounded-control border border-white/10 bg-white/[0.045] pl-3.5 pr-9 text-[0.9375rem] text-fg transition focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/15"
        {...props}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-3">%</span>
    </div>
  );
}
