import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export const metadata: Metadata = { title: { default: "Team Portal", template: "%s · VJIT SIH Team" }, manifest: "/team.webmanifest", appleWebApp: { capable: true, title: "VJIT SIH Team", statusBarStyle: "default" }, robots: { index: false, follow: false } };
export default function TeamLayout({ children }: { children: ReactNode }) { return <>{children}<InstallPrompt appName="Team Portal" storageKey="sih:team:pwa-prompt-dismissed" /></>; }
