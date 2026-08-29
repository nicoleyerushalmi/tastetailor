"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Section } from "@/components/layout/Section";

export default function HomePage() {
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: "easeOut" as const },
  });

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)]">
      {/* Hero — first viewport */}
      <div className="relative flex min-h-[100svh] flex-col">
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="photo-veil absolute inset-0" aria-hidden />
        <SiteHeader variant="on-photo" />
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-10 text-center md:px-10">
          <div className="flex max-w-3xl flex-col items-center">
            <motion.h1
              className="font-display text-[clamp(3.5rem,10vw,7rem)] font-extrabold leading-[0.92] tracking-tight text-white"
              {...fadeUp(0)}
            >
              TasteTailor
            </motion.h1>
            <motion.p
              className="mt-6 max-w-md text-lg text-white/85"
              {...fadeUp(0.1)}
            >
              Recipes fitted to how you eat.
            </motion.p>
            <motion.div
              className="mt-10 flex flex-wrap justify-center gap-4"
              {...fadeUp(0.2)}
            >
              <Link
                href="/signup"
                className="inline-flex h-16 items-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-8 text-lg font-bold text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-16 items-center rounded-[var(--radius-control)] border-2 border-white/60 bg-transparent px-8 text-lg font-bold text-white transition hover:border-white hover:bg-white/10"
              >
                Log in
              </Link>
            </motion.div>
          </div>
        </main>
      </div>

      {/* How it works */}
      <Section className="paper-grain bg-[var(--background)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          How it works
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-[var(--color-ink)] md:text-4xl">
          Paste, fit, cook.
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              n: "01",
              title: "Adapt",
              body: "Paste any recipe as-is, or start from a dish name.",
            },
            {
              n: "02",
              title: "Fit",
              body: "We reshape it to your diet, goals, and constraints.",
            },
            {
              n: "03",
              title: "Cook",
              body: "Scale servings, save favorites, and build a shopping list.",
            },
          ].map((step) => (
            <li key={step.n} className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6">
              <span className="font-display text-sm font-bold text-[var(--color-accent)]">
                {step.n}
              </span>
              <h3 className="font-display text-xl font-semibold text-[var(--color-ink)]">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Sample fitted recipe */}
      <Section className="bg-[var(--color-surface)]">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Example fit
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[var(--color-ink)] md:text-4xl">
              Same dish. Made for you.
            </h2>
            <p className="mt-4 max-w-md text-[var(--color-ink-muted)]">
              TasteTailor keeps the spirit of the original and swaps what
              doesn&apos;t match your profile — with sources when a creator
              recipe is found.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-[var(--color-border)] bg-[var(--background)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Before
              </p>
              <p className="mt-3 font-display text-lg font-semibold text-[var(--color-ink)]">
                Creamy tomato pasta
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-ink-muted)]">
                <li>Heavy cream</li>
                <li>Parmesan</li>
                <li>White pasta</li>
              </ul>
            </div>
            <div className="border border-[var(--color-ink)] bg-[var(--background)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Fitted
              </p>
              <p className="mt-3 font-display text-lg font-semibold text-[var(--color-ink)]">
                Dairy-free tomato pasta
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-ink)]">
                <li>Oat cream</li>
                <li>Nutritional yeast</li>
                <li>Whole-wheat pasta</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Closing CTA */}
      <Section className="bg-[var(--color-ink)]" contained={false}>
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              Fit your next recipe.
            </h2>
            <p className="mt-2 text-white/70">
              Create an account and tell us how you eat — once.
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex h-12 shrink-0 items-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-6 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            Get started
          </Link>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
