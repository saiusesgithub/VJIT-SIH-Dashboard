"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

interface JudgeLoginFormProps {
  returnTo: string;
  error: string | null;
}

export function JudgeLoginForm({ returnTo, error }: JudgeLoginFormProps) {
  const [mode, setMode] = useState<"pin" | "phone">("pin");

  return (
    <>
      <div className="mt-6 flex gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <button
          type="button"
          onClick={() => setMode("pin")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "pin"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          Use PIN
        </button>
        <button
          type="button"
          onClick={() => setMode("phone")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "phone"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          Use Phone & Password
        </button>
      </div>

      <form action="/judge/login/submit" method="post" className="mt-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        
        {mode === "pin" ? (
          <div>
            <label htmlFor="judge-pin" className="text-xs font-medium text-zinc-700">
              Judge PIN
            </label>
            <input
              id="judge-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              autoFocus
              required
              maxLength={128}
              className="mt-2 h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base tracking-[0.25em] text-zinc-950 outline-none transition-colors placeholder:tracking-normal placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter PIN"
              aria-describedby={error ? "judge-login-error" : "judge-access-note"}
            />
          </div>
        ) : (
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
        )}

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
