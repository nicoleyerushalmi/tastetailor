import type { ReactNode } from "react";

type SectionProps = {
  children: ReactNode;
  className?: string;
  contained?: boolean;
  id?: string;
};

export function Section({
  children,
  className = "",
  contained = true,
  id,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`py-[var(--space-section)] ${className}`}
    >
      {contained ? (
        <div className="mx-auto w-full max-w-6xl px-6 md:px-10">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
