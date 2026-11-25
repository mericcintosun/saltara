import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Syne } from "next/font/google";
import Link from "next/link";
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
const SECURITY_URL = `${SOURCE_URL}/blob/main/SECURITY.md`;
const FOOTER_LINK =
  "inline-flex min-h-11 items-center font-bold text-primary underline decoration-sun decoration-2 underline-offset-4";
const FOOTER_LINKS = [
  { label: "Source code", href: SOURCE_URL, external: true },
  { label: "PhysTech 2027 on Devpost", href: "https://phystech2027.devpost.com/", external: true },
  { label: "Security", href: SECURITY_URL, external: true },
  { label: "Notes", href: "/notes", external: false },
];
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
          <div className="mx-auto max-w-prose px-5 py-10 text-sm text-muted-foreground">
            <p className="flex items-start gap-3 leading-relaxed">
              <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sun" />
              <span>
                Runs in your browser: video stays on this laptop, the class list stays in this browser, there is no
                wallet and no account, and the pose model loads from cdn.jsdelivr.net and storage.googleapis.com.
              </span>
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5 pl-5">
              {FOOTER_LINKS.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className={FOOTER_LINK}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
