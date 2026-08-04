"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import type { ChatLogEntry } from "@/types/recipe";

type RefineChatProps = {
  chatLog: ChatLogEntry[];
  loading: boolean;
  error: string | null;
  onSubmit: (message: string) => Promise<boolean>;
};

export function RefineChat({ chatLog, loading, error, onSubmit }: RefineChatProps) {
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || loading) return;
    const ok = await onSubmit(message.trim());
    if (ok) {
      setMessage("");
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">
        Refine this recipe
      </h2>

      {chatLog.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {chatLog.map((entry, index) => (
            <li
              key={index}
              className={
                entry.role === "user"
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-ink-muted)]"
              }
            >
              <span className="font-medium">
                {entry.role === "user" ? "You: " : "TasteTailor: "}
              </span>
              {entry.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">
          Ask for a change — e.g. &ldquo;make it dairy-free&rdquo; or &ldquo;double the spice&rdquo;.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <TextArea
          label="Change request"
          name="refine_message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What would you like to change?"
          className="min-h-20"
          maxLength={500}
        />
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          Update recipe
        </Button>
      </form>
    </section>
  );
}
