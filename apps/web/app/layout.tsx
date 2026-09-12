import type { Metadata } from "next";
import { Nunito, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Nunito({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-display" });
const body = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "eduai",
  description: "A safe AI shot-generation studio for film cohorts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
