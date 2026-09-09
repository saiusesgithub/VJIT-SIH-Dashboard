"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, LoaderCircle, QrCode, RotateCcw } from "lucide-react";
import { parseJudgeTeamQrValue } from "@/lib/judge-team-qr";

type ScannerControls = { stop(): void };
const AUTO_RESUME_KEY = "sih-judge-scanner-enabled";

export function TeamQrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const startingRef = useRef(false);
  const runRef = useRef(0);
  const [state, setState] = useState<"idle" | "starting" | "scanning" | "opening" | "error">("idle");
  const [message, setMessage] = useState("");

  const stopScanner = useCallback(() => {
    runRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startScanner = useCallback(async (remember = true) => {
    if (!videoRef.current || startingRef.current || controlsRef.current) return;
    stopScanner();
    startingRef.current = true;
    const run = runRef.current;
    setMessage("");
    setState("starting");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Camera scanning requires HTTPS and a supported browser.");
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result) => {
          if (!result || run !== runRef.current) return;
          const destination = parseJudgeTeamQrValue(result.getText(), window.location.origin);
          if (!destination) {
            setMessage("That is not a valid VJIT SIH team QR code.");
            return;
          }
          setState("opening");
          stopScanner();
          router.push(destination);
        },
      );
      if (run !== runRef.current) return controls.stop();
      startingRef.current = false;
      controlsRef.current = controls;
      if (remember) sessionStorage.setItem(AUTO_RESUME_KEY, "1");
      setState("scanning");
    } catch (error) {
      if (run !== runRef.current) return;
      startingRef.current = false;
      setState("error");
      setMessage(error instanceof Error && error.message.includes("HTTPS")
        ? error.message
        : "Camera access failed. Allow camera permission, then try again or choose a team below.");
    }
  }, [router, stopScanner]);

  useEffect(() => {
    const resumeTimer = sessionStorage.getItem(AUTO_RESUME_KEY) === "1"
      ? window.setTimeout(() => void startScanner(false), 0)
      : null;
    return () => {
      if (resumeTimer !== null) window.clearTimeout(resumeTimer);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  function closeScanner() {
    stopScanner();
    startingRef.current = false;
    sessionStorage.removeItem(AUTO_RESUME_KEY);
    setMessage("");
    setState("idle");
  }

  const active = state === "starting" || state === "scanning" || state === "opening";
  return (
    <section aria-labelledby="team-scanner-title" className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white"><QrCode className="size-5" /></div>
        <div className="min-w-0 flex-1"><h2 id="team-scanner-title" className="text-base font-semibold text-zinc-950">Scan a team QR</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Point the rear camera at a team desk card. You stay signed in while moving between teams.</p></div>
      </div>
      <div className={`relative mx-4 mb-4 overflow-hidden rounded-lg bg-zinc-950 sm:mx-5 sm:mb-5 ${active ? "aspect-[4/3]" : ""}`}>
        <video ref={videoRef} muted playsInline className={`${active ? "block" : "hidden"} size-full object-cover`} aria-label="Team QR camera preview" />
        {state === "scanning" ? <div aria-hidden="true" className="pointer-events-none absolute inset-[14%] rounded-xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]"><span className="absolute -left-0.5 -top-0.5 size-7 border-l-4 border-t-4 border-blue-400" /><span className="absolute -right-0.5 -top-0.5 size-7 border-r-4 border-t-4 border-blue-400" /><span className="absolute -bottom-0.5 -left-0.5 size-7 border-b-4 border-l-4 border-blue-400" /><span className="absolute -bottom-0.5 -right-0.5 size-7 border-b-4 border-r-4 border-blue-400" /></div> : null}
        {state === "starting" || state === "opening" ? <div className="absolute inset-0 grid place-items-center bg-zinc-950/75 text-white"><div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin" /><p className="mt-2 text-xs font-medium">{state === "opening" ? "Opening team…" : "Starting camera…"}</p></div></div> : null}
        {!active ? <button type="button" onClick={() => void startScanner()} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 px-4 py-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-400"><Camera className="size-6" />{state === "error" ? "Try camera again" : "Open camera scanner"}<span className="text-[11px] font-normal text-zinc-400">Camera permission is requested once</span></button> : null}
      </div>
      {message ? <p role="alert" className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 sm:mx-5">{message}</p> : null}
      {active ? <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-xs sm:px-5"><span className="flex items-center gap-1.5 text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> Camera active</span><button type="button" onClick={closeScanner} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"><CameraOff className="size-3.5" /> Stop</button></div> : state === "error" ? <div className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 sm:px-5"><span className="inline-flex items-center gap-1.5"><RotateCcw className="size-3.5" /> The manual team list remains available below.</span></div> : null}
    </section>
  );
}
