import { Card } from "@/components/ui/card";

export default function PlaySkeleton() {
  return (
    <div className="mx-auto max-w-prose px-5 pt-12">
      <Card role="status" className="saltara-wipe flex items-center gap-3 p-6 text-lg">
        <span aria-hidden className="size-3 shrink-0 rounded-full bg-sun" />
        Loading the jump lab and the 9B lesson
      </Card>
    </div>
  );
}
