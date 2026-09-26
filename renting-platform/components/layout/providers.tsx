"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster />
    </MotionConfig>
  );
}
