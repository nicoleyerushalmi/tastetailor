type StepListProps = {
  steps: string[];
};

export function StepList({ steps }: StepListProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">Steps</h2>
      <ol className="list-decimal space-y-2 pl-5 text-[var(--color-ink)]">
        {steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
