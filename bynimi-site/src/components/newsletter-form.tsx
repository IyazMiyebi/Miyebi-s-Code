"use client";

import { useActionState } from "react";
import { joinNewsletter, type NewsletterState } from "@/app/actions/newsletter";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(joinNewsletter, { status: "idle" });

  if (state.status === "joined") {
    return (
      <p role="status" className="page-in font-serif text-3xl">
        You&apos;re in. <em className="text-muted">Welcome to the circle.</em>
      </p>
    );
  }

  return (
    <form action={action} className="w-full max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email"
          defaultValue={state.status === "error" ? state.email : undefined}
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "newsletter-error" : undefined}
          className="min-w-0 flex-1 rounded-full border border-line bg-surface/80 px-6 py-4 text-ink backdrop-blur placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          disabled={pending}
          className="label rounded-full bg-accent px-7 py-4 text-accent-ink transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {pending ? "Joining…" : "Join"}
        </button>
      </div>
      {state.status === "error" && (
        <p id="newsletter-error" role="alert" className="mt-3 text-sm text-warning">
          {state.message}
        </p>
      )}
    </form>
  );
}
