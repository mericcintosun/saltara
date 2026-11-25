"use client";

import { useState } from "react";
import { Download, RotateCcw, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RosterStudent {
  id: string;
  name: string;
  /** Up to three attempts, flight-time height in cm. */
  attempts: number[];
}

export const MAX_ATTEMPTS = 3;

export function bestOf(s: RosterStudent): number | null {
  return s.attempts.length ? Math.max(...s.attempts) : null;
}

function toCsv(roster: RosterStudent[], lessonName: string): string {
  const head = ["class", "student", "attempt_1_cm", "attempt_2_cm", "attempt_3_cm", "best_cm", "method"];
  const rows = roster.map((s) => [
    lessonName,
    s.name,
    ...Array.from({ length: MAX_ATTEMPTS }, (_, i) => (s.attempts[i] !== undefined ? s.attempts[i].toFixed(1) : "")),
    bestOf(s)?.toFixed(1) ?? "",
    "parabola flight time",
  ]);
  return [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
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
          <p className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
            No students yet. Add a name above, or restore the demo class.
          </p>
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
                    <span className="flex items-center gap-2">
                      {isActive && <span aria-hidden className="size-2.5 rounded-full bg-sun" />}
                      {s.name}
                    </span>
                    <span className="flex items-center gap-3 font-normal">
                      <span className="tabular-nums">
                        {Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
                          s.attempts[i] !== undefined ? s.attempts[i].toFixed(1) : "·"
                        ).join("  ")}
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
