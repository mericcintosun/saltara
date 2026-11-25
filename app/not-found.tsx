import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose px-5 py-24">
      <div className="space-y-4 rounded-3xl bg-card p-8 text-center">
        <span aria-hidden className="mx-auto block size-3 rounded-full bg-sun" />
        <h2 className="text-2xl font-bold">Saltara has no page here</h2>
        <p className="leading-relaxed text-muted-foreground">This jump landed off the map.</p>
        <Button asChild variant="secondary">
          <Link href="/">Back to the story</Link>
        </Button>
      </div>
    </div>
  );
}
