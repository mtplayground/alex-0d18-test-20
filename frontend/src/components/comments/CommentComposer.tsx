import type { FormEvent } from "react";

export function CommentComposer({
  id,
  value,
  isSubmitting,
  onChange,
  onSubmit
}: {
  id: string;
  value: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={id} className="sr-only">
        Add a comment
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={1000}
        rows={2}
        disabled={isSubmitting}
        className="w-full resize-none rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm outline-none transition-colors placeholder:text-app-muted focus:border-app-ring focus:ring-2 focus:ring-app-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="Add a comment."
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-app-muted">{value.length}/1000</span>
        <button
          type="submit"
          disabled={!value.trim() || isSubmitting}
          className="inline-flex h-9 items-center justify-center rounded-md bg-app-accent px-3 text-sm font-semibold text-app-surface transition-colors hover:bg-app-accentHover focus:outline-none focus:ring-2 focus:ring-app-ring focus:ring-offset-2 focus:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Posting" : "Post"}
        </button>
      </div>
    </form>
  );
}
