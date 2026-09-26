"use client";

import { useId, type ReactNode } from "react";
import { Label } from "./input";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}

/** Label + control + hint/error with correct ARIA wiring. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-small text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-small text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
