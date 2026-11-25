import { Card } from "@/components/ui/card";

export default function NotesSkeleton() {
  return (
    <div className="mx-auto max-w-prose px-5 pt-12">
      <Card role="status" className="saltara-wipe flex items-center gap-3 p-6 text-lg">
        <span aria-hidden className="size-3 shrink-0 rounded-full bg-sun" />
        Loading the method notes and the pilot rows
      </Card>
    </div>
  );
}
