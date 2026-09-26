"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only after hydration — used to read persisted client state without mismatches. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
