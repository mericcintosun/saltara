"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Story" },
  { href: "/play", label: "Jump lab" },
  { href: "/notes", label: "Notes" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <BrandMark />
          Saltara
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map((item) => {
            const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Button key={item.href} asChild size="sm" variant={current ? "secondary" : "ghost"}>
                <Link href={item.href} aria-current={current ? "page" : undefined}>
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
