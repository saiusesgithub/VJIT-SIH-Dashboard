"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin dashboard data error", error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center p-6">
      <div className="max-w-sm text-center">
        <p className="font-mono text-xs font-semibold text-red-700">DATA UNAVAILABLE</p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-950">The dashboard could not be loaded</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Check the database connection and try again. Database details have not been exposed.</p>
        <button onClick={reset} className="mt-5 rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800">Try again</button>
      </div>
    </main>
  );
}
