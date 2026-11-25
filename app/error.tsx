"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomeErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <div className="space-y-4 rounded-3xl bg-card p-8 text-center">
        <span aria-hidden className="mx-auto block size-3 rounded-full bg-sun" />
        <h2 className="text-2xl font-bold">Saltara tripped on this page</h2>
        <p className="leading-relaxed text-muted-foreground">
          Something went wrong while drawing it. Your class list is still saved on this laptop.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to the story</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
