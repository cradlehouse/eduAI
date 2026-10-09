import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imaje",
  description: "Imaje: a studio where young filmmakers make films with AI, with integrity and an honest footprint.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
