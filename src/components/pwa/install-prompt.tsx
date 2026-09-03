"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function recentlyDismissed(storageKey: string) {
  try {
    const dismissedAt = Number(localStorage.getItem(storageKey));
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt({ appName, storageKey }: { appName: string; storageKey: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed(storageKey)) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isIos) {
      timer = setTimeout(() => {
        setShowIosInstructions(true);
        setVisible(true);
      }, 900);
    }

    function handleInstallAvailable(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      timer = setTimeout(() => setVisible(true), 900);
    }

    function handleInstalled() {
      setVisible(false);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [storageKey]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // The prompt can still close if storage is unavailable.
    }
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setInstallEvent(null);
    } else {
      dismiss();
    }
  }

  if (!visible || (!installEvent && !showIosInstructions)) return null;

  return (
    <aside role="dialog" aria-label={`Install ${appName}`} aria-live="polite" className="install-prompt fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_16px_50px_rgba(24,24,27,0.16)]">
      <button type="button" onClick={dismiss} className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-800" aria-label="Dismiss install prompt"><X className="size-4" /></button>
      <div className="flex gap-3 pr-9">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white"><Smartphone className="size-5" /></div>
        <div><h2 className="text-sm font-semibold text-zinc-950">Install {appName}</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Keep the hackathon workspace on your home screen for faster access during the event.</p></div>
      </div>
      {showIosInstructions ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-5 text-zinc-600"><Share className="mt-0.5 size-4 shrink-0 text-blue-600" /><p>In Safari, tap <span className="font-semibold text-zinc-900">Share</span>, then choose <span className="font-semibold text-zinc-900">Add to Home Screen</span>.</p></div>
      ) : (
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={dismiss} className="min-h-10 rounded-md px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900">Not now</button><button type="button" onClick={install} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"><Download className="size-4" /> Install app</button></div>
      )}
    </aside>
  );
}
