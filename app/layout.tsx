import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoupleSync",
  description: "Wekelijkse en maandelijkse syncs voor koppels",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
