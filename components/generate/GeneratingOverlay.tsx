"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const MESSAGES = [
  "Fitting this recipe to how you eat…",
  "Balancing ingredients and swaps…",
  "Checking your diet and goals…",
  "Writing clear steps…",
  "Almost ready — plating the details…",
];

type GeneratingOverlayProps = {
  open: boolean;
};

export function GeneratingOverlay({ open }: GeneratingOverlayProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % MESSAGES.length);
    }, 3200);
    return () => {
      window.clearInterval(timer);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-ink)]/55 px-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Generating recipe"
        >
          <motion.div
            className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-10 text-center shadow-[var(--shadow-soft)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
            <p className="font-display text-xl font-semibold text-[var(--color-ink)]">
              Fitting your recipe
            </p>
            <p
              key={index}
              className="mt-3 min-h-[3rem] text-sm text-[var(--color-ink-muted)]"
            >
              {MESSAGES[index]}
            </p>
            <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
              This can take up to half a minute when the kitchen is busy.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
