"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Story" },
  { href: "/play", label: "Jump lab" },
  { href: "/notes", label: "Notes" },
];

const MENU_ID = "site-menu";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <BrandMark />
          Saltara
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const current = isCurrent(item.href);
            return (
              <Button key={item.href} asChild size="sm" variant={current ? "secondary" : "ghost"}>
                <Link href={item.href} aria-current={current ? "page" : undefined}>
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      <nav
        id={MENU_ID}
        aria-label="Main mobile"
        hidden={!open}
        className="border-t border-border bg-background md:hidden"
      >
        <ul className="mx-auto flex max-w-5xl flex-col gap-1 px-5 py-3">
          {NAV.map((item) => {
            const current = isCurrent(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-2xl px-4 font-bold",
                    current ? "bg-secondary" : "hover:bg-secondary"
                  )}
                >
                  <span aria-hidden className={cn("size-2 rounded-full", current ? "bg-sun" : "bg-border")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
