import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SanctionShield — Sanctions Screening for SMBs",
  description: "Screen customers, vendors, and partners against OFAC, EU, and UN sanctions lists. Avoid $330K+ penalties with automated compliance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
