import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "subtle";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-[var(--ease-out-soft)] " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2/80 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-[linear-gradient(180deg,#2b95ff,#0a84ff)] border border-white/15 " +
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_-8px_rgb(10_132_255/0.7)] " +
    "hover:bg-[linear-gradient(180deg,#46a3ff,#1a8cff)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_30px_-8px_rgb(10_132_255/0.85)]",
  secondary:
    "text-fg bg-white/[0.07] border border-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] " +
    "hover:bg-white/[0.11] hover:border-white/15",
  ghost: "text-fg-2 hover:text-fg hover:bg-white/[0.06] border border-transparent",
  subtle: "text-accent-2 bg-accent/10 border border-accent/20 hover:bg-accent/15",
  destructive: "text-danger bg-danger/10 border border-danger/20 hover:bg-danger/15 hover:border-danger/30",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small rounded-[10px]",
  md: "h-10 px-4 text-[0.875rem] rounded-control",
  lg: "h-12 px-6 text-[0.9375rem] rounded-[14px]",
  icon: "h-10 w-10 rounded-control",
  "icon-sm": "h-8 w-8 rounded-[10px]",
};

export function buttonStyles(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, leftIcon, rightIcon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function ButtonLink({ variant = "secondary", size = "md", leftIcon, rightIcon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles(variant, size, className)} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
