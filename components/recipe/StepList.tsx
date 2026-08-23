type StepListProps = {
  steps: string[];
};

export function StepList({ steps }: StepListProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold text-[var(--color-ink)]">
        Steps
      </h2>
      <ol className="flex flex-col gap-5">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-4">
            <span className="font-display text-sm font-bold text-[var(--color-accent)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-[var(--color-ink)] leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
