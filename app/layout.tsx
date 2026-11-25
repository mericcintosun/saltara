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

const SITE_URL = "https://saltara.vercel.app";
const SOURCE_URL = "https://github.com/mericcintosun/saltara";
const TITLE = "Saltara: gravity measures your vertical jump";
const DESCRIPTION =
  "Force plates cost a fortune, so most PE classes skip the jump test. Saltara measures jump height from a laptop webcam, using gravity as the ruler.";

export const metadata: Metadata = {
  title: { default: TITLE, template: "%s | Saltara" },
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: { title: TITLE, description: DESCRIPTION, url: SITE_URL, siteName: "Saltara", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
            <section aria-labelledby="about-security" className="mt-4 rounded-3xl bg-card p-5">
              <h2 id="about-security" className="flex items-center gap-2 text-base font-bold text-foreground">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sun" />
                About and security
              </h2>
              <ul className="mt-3 space-y-1.5">
                <li>No wallet, no account, no contract.</li>
                <li>Video frames stay on this laptop; the class list is kept only in this browser.</li>
                <li>The pose model files download from cdn.jsdelivr.net and storage.googleapis.com.</li>
              </ul>
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center font-bold text-primary underline decoration-sun decoration-2 underline-offset-4"
              >
                Source code
              </a>
            </section>
          </div>
        </footer>
      </body>
    </html>
  );
}
