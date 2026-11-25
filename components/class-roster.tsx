"use client";

import { useState } from "react";
import { Download, RotateCcw, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { bestOf, MAX_ATTEMPTS, type AttemptOrigin, type RosterStudent } from "@/lib/store";
import { cn } from "@/lib/utils";

export { bestOf, MAX_ATTEMPTS, type RosterAttempt, type RosterStudent } from "@/lib/store";

const SOURCE_LABEL: Record<AttemptOrigin, string> = { seed: "seeded", camera: "camera", file: "clip" };

function toCsv(roster: RosterStudent[], lessonName: string): string {
  const head = [
    "class",
    "student",
    ...Array.from({ length: MAX_ATTEMPTS }, (_, i) => [`attempt_${i + 1}_cm`, `attempt_${i + 1}_source`]).flat(),
    "best_cm",
    "method",
  ];
  const rows = roster.map((s) => [
    lessonName,
    s.name,
    ...Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
      const a = s.attempts[i];
      return a ? [a.cm.toFixed(1), SOURCE_LABEL[a.origin]] : ["", ""];
    }).flat(),
    bestOf(s)?.toFixed(1) ?? "",
    "parabola flight time",
  ]);
  return [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function RosterEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-background p-4 text-sm">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sun" />
      <p className="flex-1 text-muted-foreground">Students and their three attempts appear here once you add a name above or restore the demo class.</p>
      <Button size="sm" variant="soft" onClick={onReset}>
        <RotateCcw /> Restore demo class
      </Button>
    </div>
  );
}

/** Class mode: who is jumping, their three attempts, best mark, CSV export. */
export function ClassRoster({
  lessonName,
  roster,
  activeId,
  onSelect,
  onAddStudent,
  onReset,
}: {
  lessonName: string;
  roster: RosterStudent[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddStudent: (name: string) => void;
  onReset: () => void;
}) {
  const [name, setName] = useState("");
  const classBest = Math.max(0, ...roster.map((s) => bestOf(s) ?? 0));

  const download = () => {
    const blob = new Blob([toCsv(roster, lessonName)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saltara-${lessonName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lessonName}</CardTitle>
        <CardDescription>
          Pick who jumps next, then jump. Each student gets {MAX_ATTEMPTS} attempts; the best one counts. Saved on this
          laptop only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              onAddStudent(name.trim());
              setName("");
            }
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" aria-label="Student name" className="bg-background" />
          <Button type="submit" variant="secondary">
            <UserPlus /> Add
          </Button>
        </form>

        {roster.length === 0 ? (
          <RosterEmptyState onReset={onReset} />
        ) : (
          <div className="overflow-x-auto rounded-2xl">
          <ul className="min-w-max space-y-2 sm:min-w-0">
            {roster.map((s) => {
              const best = bestOf(s);
              const isActive = s.id === activeId;
              return (
                <li key={s.id}>
                  <Button
                    variant={isActive ? "default" : "soft"}
                    onClick={() => onSelect(s.id)}
                    aria-pressed={isActive}
                    className={cn("h-auto w-full justify-between rounded-2xl px-4 py-3", !isActive && "bg-background")}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {isActive && <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sun" />}
                      <span className="max-w-[12rem] truncate" title={s.name}>
                        {s.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 font-normal">
                      <span className="flex items-center gap-3 tabular-nums">
                        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
                          const attempt = s.attempts[i];
                          if (!attempt) return <span key={i}>·</span>;
                          return (
                            <span key={attempt.key} className="flex items-center gap-1" data-origin={attempt.origin}>
                              {attempt.cm.toFixed(1)}
                              {attempt.origin === "seed" && (
                                <Badge variant="sun" className="px-2 py-0.5 font-normal">
                                  seeded
                                </Badge>
                              )}
                            </span>
                          );
                        })}
                      </span>
                      {best !== null && best === classBest ? (
                        <Badge variant="sun">best {best.toFixed(1)}</Badge>
                      ) : (
                        <span className="w-20 text-right font-bold tabular-nums">{best !== null ? `${best.toFixed(1)} cm` : "no jump"}</span>
                      )}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={download} disabled={roster.length === 0} variant="sun">
            <Download /> Download CSV
          </Button>
          <Button onClick={onReset} variant="ghost">
            <RotateCcw /> Restore demo class
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
