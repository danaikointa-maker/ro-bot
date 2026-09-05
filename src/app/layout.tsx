import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RO Bot - Ragnarok ADB Control System",
  description: "Control Ragnarok: The New World on Android via ADB. Screen mirror, bot automation, auto-farm, auto-attack, party support.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-[#0a0e1a] text-slate-200 antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}
