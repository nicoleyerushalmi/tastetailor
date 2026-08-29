"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-accent)]/50",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-white",
  ghost: "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const classNames = `inline-flex h-11 items-center justify-center rounded-[var(--radius-control)] px-5 text-sm font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${className}`;

  if (loading) {
    return (
      <motion.button
        type={type}
        disabled
        className={classNames}
        animate={{ opacity: [1, 0.55, 1], scale: [1, 0.98, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        {...(props as object)}
      >
        Please wait…
      </motion.button>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classNames}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
