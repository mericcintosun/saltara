import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Syne } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-syne",
});

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: { default: "Saltara: vertical jump height from a laptop webcam", template: "%s | Saltara" },
  description:
    "Jump in front of your laptop camera. Saltara uses gravity as the ruler and measures your vertical jump in centimetres: no mat, no force plate, no tape measure, no calibration.",
  metadataBase: new URL("https://saltara.vercel.app"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${atkinson.variable}`}>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main>{children}</main>
        <footer className="mt-24 border-t border-border">
          <div className="mx-auto flex max-w-prose flex-col gap-2 px-5 py-10 text-sm text-muted-foreground">
            <p>
              Saltara runs entirely in your browser. Video frames never leave the laptop; only the hip and ankle
              heights are kept, and only on this device.
            </p>
            <p>Built for PhysTech 2027: Physical Activity and Technology Hack Day.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
