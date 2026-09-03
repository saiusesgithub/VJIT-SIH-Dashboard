"use client";

import { useState } from "react";
import { LoaderCircle, Printer } from "lucide-react";

export function PrintQrButton({ disabled }: { disabled: boolean }) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  async function print() {
    if (preparing) return;
    setPreparing(true);
    setError("");
    try {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("[data-team-qr-image]"));
      await Promise.all(images.map((image) => image.decode()));
      await document.fonts.ready;
      window.print();
    } catch { setError("Some QR images could not load. Refresh before printing."); }
    finally { setPreparing(false); }
  }
  return <div><button type="button" onClick={print} disabled={disabled || preparing} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">{preparing ? <LoaderCircle className="size-4 animate-spin" /> : <Printer className="size-4" />}{preparing ? "Preparing…" : "Print / Save PDF"}</button>{error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}</div>;
}
