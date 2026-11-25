import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose px-5 py-16 sm:py-24">
      <Card className="space-y-4 p-8 text-center">
        <div className="mx-auto max-w-xs overflow-hidden rounded-3xl">
          <SceneSlot
            n={6}
            alt="A lone sneaker resting on a pale green floor beside a plum leaf and a small sun"
            width={720}
            height={720}
          />
        </div>
        <span aria-hidden className="mx-auto block size-3 rounded-full bg-sun" />
        <h2 className="text-2xl font-bold">Saltara has no page here</h2>
        <p className="leading-relaxed text-muted-foreground">
          This jump landed off the map; the story and the jump lab are where they were.
        </p>
        <Button asChild variant="secondary">
          <Link href="/">Back to the story</Link>
        </Button>
      </Card>
    </div>
  );
}
