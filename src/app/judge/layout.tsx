import type { ReactNode } from "react";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export default function JudgeLayout({ children }: { children: ReactNode }) {
  return <>{children}<InstallPrompt appName="Judge Workspace" storageKey="sih:judge:pwa-prompt-dismissed" /></>;
}
