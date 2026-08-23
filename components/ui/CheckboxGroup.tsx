type CheckboxOption = {
  value: string;
  label: string;
};

type CheckboxGroupProps = {
  label: string;
  options: CheckboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  name: string;
};

export function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  error,
  name,
}: CheckboxGroupProps) {
  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-[var(--color-ink)]">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm transition ${
                checked
                  ? "border-[var(--color-ink)] bg-[var(--color-surface)] text-[var(--color-ink)]"
                  : "border-[var(--color-border)] bg-transparent text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)]"
              }`}
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => toggle(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      ) : null}
    </fieldset>
  );
}
