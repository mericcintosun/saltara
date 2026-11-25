"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotesErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <div role="alert" className="space-y-4 rounded-3xl bg-card p-8 text-center">
        <span aria-hidden className="mx-auto block size-3 rounded-full bg-sun" />
        <h2 className="text-2xl font-bold">The notes page tripped.</h2>
        <p className="leading-relaxed text-muted-foreground">
          The method notes could not be drawn this time. The jump lab still works.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/play">Open the jump lab</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
