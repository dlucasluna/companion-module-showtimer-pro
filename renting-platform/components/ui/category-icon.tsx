import {
  AudioLines,
  BatteryCharging,
  Cable,
  Camera,
  Clapperboard,
  Joystick,
  LifeBuoy,
  Monitor,
  Network,
  Package,
  Sparkles,
  Usb,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Whitelist of icons selectable for categories (stored by name in the database). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  camera: Camera,
  joystick: Joystick,
  clapperboard: Clapperboard,
  usb: Usb,
  "audio-lines": AudioLines,
  network: Network,
  monitor: Monitor,
  "battery-charging": BatteryCharging,
  cable: Cable,
  wrench: Wrench,
  sparkles: Sparkles,
  "life-buoy": LifeBuoy,
  package: Package,
};

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Package;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}
