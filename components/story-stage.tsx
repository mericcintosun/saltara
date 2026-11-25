"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JumpDeck, type DeckItem } from "@/components/jump-deck";
import { TrajectoryPlot } from "@/components/trajectory-plot";
import { traceFor } from "@/lib/data/trace";
import { analyzeJump, headlineCm } from "@/lib/jump-solver";
import type { LessonPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHAPTERS = [
  { id: "stand", label: "Stand", layer: 0 },
  { id: "leave", label: "Leave", layer: 1 },
  { id: "ruler", label: "Ruler", layer: 2 },
  { id: "three", label: "Three", layer: 3 },
  { id: "class", label: "Class", layer: 3 },
] as const;

const DEFAULT_JUMP_ID = "j-02";

/** Minutes between the first and last recorded jump of the lesson. */
function lessonMinutes(recordedAt: string[]): number {
  const times = recordedAt.map((s) => new Date(s).getTime()).filter((t) => Number.isFinite(t));
  if (times.length < 2) return 0;
  return Math.round((Math.max(...times) - Math.min(...times)) / 60000);
}

/** No recorded jumps in the lesson: point to the lab instead of showing an empty deck. */
function StoryEmptyState() {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-6 text-lg leading-relaxed">
      <span aria-hidden className="size-3 shrink-0 rounded-full bg-sun" />
      <p>
        The story figure appears here once the lesson has recorded jumps; until then, measure one in the{" "}
        <Link href="/play" className="font-bold text-primary underline decoration-sun decoration-2 underline-offset-4">
          jump lab
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * The home story. One live figure (trajectory + throwable deck of the lesson's
 * jumps) stays pinned while five chapters scroll past and change what it shows.
 */
export function StoryStage({ lesson: payload, classScene }: { lesson: LessonPayload; classScene: React.ReactNode }) {
  const { lesson, students, jumps } = payload;
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "Unknown";
  const runs = useMemo(
    () =>
      jumps.map((j) => {
        const samples = traceFor(j);
        return { jump: j, samples, analysis: analyzeJump(samples) };
      }),
    [jumps]
  );
  const [index, setIndex] = useState(() => Math.max(0, jumps.findIndex((j) => j.id === DEFAULT_JUMP_ID)));
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(CHAPTERS.findIndex((c) => c.id === e.target.id));
        }
      },
      { rootMargin: "-62% 0px -28% 0px" }
    );
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jumpTo = (i: number) => {
    setActive(i);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(CHAPTERS[i].id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  };

  const run = runs[index] ?? runs[0];
  if (payload.jumps.length === 0 || !run) return <StoryEmptyState />;
  const a = run.analysis;
  const name = studentName(run.jump.studentId);
  const first = name.split(" ")[0];
  const est = a.estimates;
  const deck: DeckItem[] = runs.map((r) => ({
    id: r.jump.id,
    title: studentName(r.jump.studentId),
    subtitle: `Attempt ${r.jump.attempt}, ${r.jump.fps} fps`,
    valueCm: headlineCm(r.analysis),
  }));
  const best = runs.reduce((b, r) => ((headlineCm(r.analysis) ?? 0) > (headlineCm(b.analysis) ?? 0) ? r : b), runs[0]);
  const f1 = (v: number) => v.toFixed(1);

  return (
    <div>
      <figure className="sticky top-16 z-10 -mx-5 bg-background px-5 pb-4 pt-3">
        <nav aria-label="Chapters" className="mb-3 flex items-center gap-1 overflow-x-auto sm:flex-wrap">
          {CHAPTERS.map((c, i) => (
            <Button
              key={c.id}
              size="sm"
              variant={i === active ? "secondary" : "ghost"}
              aria-current={i === active ? "step" : undefined}
              onClick={() => jumpTo(i)}
            >
              <span aria-hidden className={cn("size-2 rounded-full", i === active ? "bg-sun" : "bg-border")} />
              {c.label}
            </Button>
          ))}
        </nav>
        <TrajectoryPlot samples={run.samples} analysis={a} layer={CHAPTERS[active].layer} />
        <figcaption className="sr-only">
          Hip trajectory of {name}, attempt {run.jump.attempt}.
        </figcaption>
        <div className="mt-3">
          <JumpDeck items={deck} index={index} onIndexChange={setIndex} label={`Recorded jumps, ${lesson.className}`} />
        </div>
      </figure>

      <div className="space-y-2">
        <section id="stand" className="min-h-[55vh] scroll-mt-[50vh] py-10">
          <h2 className="saltara-wipe-scroll text-3xl font-bold">Stand still for half a second</h2>
          <p className="mt-4 text-lg leading-relaxed">
            {first} faces the laptop from about two metres away. For the first 0.5 seconds of the clip Saltara only
            watches: the hip settles at {Math.round(a.standingHipY)} px from the top of a 720 px frame and the ankles at{" "}
            {Math.round(a.standingAnkleY)} px. That is the whole calibration. Nobody types a height, tapes a marker to
            the wall or holds up a ruler.
          </p>
        </section>

        <section id="leave" className="min-h-[55vh] py-10">
          <h2 className="saltara-wipe-scroll text-3xl font-bold">Leave the ground</h2>
          <p className="mt-4 text-lg leading-relaxed">
            The ankles lift clear of the standing line on frame {a.takeoffIndex} and come back {a.airborneFrames} frames
            later. At {Math.round(a.fps)} fps that is {Math.round((a.airborneFrames / a.fps) * 1000)} ms in the air, and
            counting frames alone already says {est ? f1(est.frameCountCm) : "nothing usable"} cm. But a {Math.round(a.fps)}{" "}
            fps webcam can only place take-off and landing to within {Math.round(1000 / a.fps)} ms, so frame counting
            wobbles by several centimetres from one attempt to the next. The purple points are the frames Saltara trusts
            as airborne.
          </p>
        </section>

        <section id="ruler" className="min-h-[55vh] py-10">
          <h2 className="saltara-wipe-scroll text-3xl font-bold">Gravity is the ruler</h2>
          <p className="mt-4 text-lg leading-relaxed">
            Everything in the air falls at 9.81 m/s². Saltara fits y = at² + bt + c through the {a.airborneFrames} purple
            points{a.fit ? ` (R² ${a.fit.r2.toFixed(3)})` : ""}. The curvature a has to equal half of g, so the fit
            hands back the scale for free: {a.pxPerMetre ? Math.round(a.pxPerMetre) : "no"} pixels per metre at{" "}
            {`${first}'s`} distance from the camera. Move the laptop, change the zoom, use a different webcam: the next jump
            measures its own scale again.
          </p>
          <div className="mt-8 rounded-3xl bg-card p-6">
            <p className="text-base">
              No mat, no force plate, no tape measure. A laptop with a camera and a strip of empty wall.
            </p>
            <Button asChild size="lg" className="mt-4">
              <Link href="/play">Measure your own jump</Link>
            </Button>
          </div>
        </section>

        <section id="three" className="min-h-[55vh] py-10">
          <h2 className="saltara-wipe-scroll text-3xl font-bold">Three answers, side by side</h2>
          {est ? (
            <p className="mt-4 text-lg leading-relaxed">
              Counting frames says {f1(est.frameCountCm)} cm. The roots of the parabola fall between frames and give a
              flight time that says {f1(est.flightTimeCm)} cm; this is the number Saltara reports. The rise from the
              standing hip to the apex, converted with the gravity scale, says {f1(est.displacementCm)} cm. That last one
              includes the heel raise before toe-off, the same thing a chalk mark on the wall captures, so it should sit a
              few centimetres higher. When the first two disagree by more than 3 cm, the attempt is worth repeating.
            </p>
          ) : (
            <p className="mt-4 text-lg leading-relaxed">This attempt was rejected: {a.reason}</p>
          )}
        </section>

        <section id="class" className="min-h-[55vh] py-10">
          <h2 className="saltara-wipe-scroll text-3xl font-bold">The whole class in one lesson</h2>
          <p className="mt-4 text-lg leading-relaxed">
            Throw the deck to flip through {lesson.className}: {runs.length} seeded jumps from {students.length}{" "}
            students, recorded in about {lessonMinutes(jumps.map((j) => j.recordedAt))} minutes on {lesson.date}. Best of the lesson so far is {studentName(best.jump.studentId)} at{" "}
            {f1(headlineCm(best.analysis) ?? 0)} cm. A class of 30 with three attempts each fits inside one 40 minute PE
            period, and the table downloads as a CSV at the end.
          </p>
          <div className="mt-6 overflow-hidden rounded-3xl">{classScene}</div>
          <p className="mt-6 text-lg">
            Your turn. The jump lab runs the same solver on your own webcam, keeps a class list on this laptop and
            exports it.{" "}
            <Button asChild variant="link" className="h-auto px-0 text-lg">
              <Link href="/play">Open the jump lab</Link>
            </Button>
          </p>
        </section>
      </div>
    </div>
  );
}
