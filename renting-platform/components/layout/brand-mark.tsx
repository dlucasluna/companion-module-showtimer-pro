import { cn } from "@/lib/utils";

/** Abstract mark: a lens ring with a live dot. Replace with the company logo in Configurações. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-[10px] border border-white/15 bg-[linear-gradient(160deg,#1c1c22,#0b0b0e)] shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_6px_18px_-6px_rgb(10_132_255/0.6)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
        <circle cx="12" cy="12" r="7.25" stroke="url(#bm)" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="2.5" fill="#0A84FF" />
        <defs>
          <linearGradient id="bm" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#8E8E99" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
