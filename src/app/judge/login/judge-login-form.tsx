"use client";

import { ArrowRight } from "lucide-react";

interface JudgeLoginFormProps {
  returnTo: string;
  error: string | null;
}

export function JudgeLoginForm({ returnTo, error }: JudgeLoginFormProps) {
  return (
    <>
      <form action="/judge/login/submit" method="post" className="mt-6">
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="space-y-4">
            <div>
              <label htmlFor="judge-phone" className="text-xs font-medium text-zinc-700">
                Phone Number
              </label>
              <input
                id="judge-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                required
                maxLength={20}
                className="mt-2 h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="9154527454"
                aria-describedby={error ? "judge-login-error" : "judge-access-note"}
              />
            </div>
            <div>
              <label htmlFor="judge-password" className="text-xs font-medium text-zinc-700">
                Password
              </label>
              <input
                id="judge-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                className="mt-2 h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter password"
              />
            </div>
        </div>

        {error ? (
          <p id="judge-login-error" role="alert" className="mt-2.5 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
        >
          Continue <ArrowRight className="size-4" />
        </button>
      </form>
    </>
  );
}
