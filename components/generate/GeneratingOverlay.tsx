"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const MESSAGES = [
  "Fitting this recipe to you",
  "Balancing ingredients and swaps…",
  "Checking your diet and goals…",
  "Writing clear steps…",
  "Almost ready — plating the details…",
];

const SLOW_MESSAGES = [
  "Still working — this can take a bit longer than usual…",
  "The kitchen's busier than usual, hang tight…",
];

// After this long, swap to slower-going copy — a generic reassurance, not
// tied to any real signal from the server about what's actually happening.
const SLOW_THRESHOLD_MS = 60_000;

type GeneratingOverlayProps = {
  open: boolean;
};

export function GeneratingOverlay({ open }: GeneratingOverlayProps) {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      setSlow(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const messageTimer = window.setInterval(() => {
      setIndex((current) => (current + 1) % MESSAGES.length);
    }, 3200);
    const slowTimer = window.setTimeout(() => {
      setSlow(true);
      setIndex(0);
    }, SLOW_THRESHOLD_MS);
    return () => {
      window.clearInterval(messageTimer);
      window.clearTimeout(slowTimer);
      document.body.style.overflow = "";
    };
  }, [open]);

  const messages = slow ? SLOW_MESSAGES : MESSAGES;

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
              {messages[index]}
            </p>
            <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
              {slow
                ? "This is taking a little longer than usual — thanks for your patience."
                : "This can take up to a few minutes when the kitchen is busy."}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
