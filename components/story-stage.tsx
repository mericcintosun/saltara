"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JumpDeck, type DeckItem } from "@/components/jump-deck";
import { TrajectoryPlot } from "@/components/trajectory-plot";
import { lesson, seedJumps, studentName, traceFor } from "@/lib/data";
import { analyzeJump, headlineCm } from "@/lib/jump-solver";
import { cn } from "@/lib/utils";

const CHAPTERS = [
  { id: "stand", label: "Stand", layer: 0 },
  { id: "leave", label: "Leave", layer: 1 },
  { id: "ruler", label: "Ruler", layer: 2 },
  { id: "three", label: "Three", layer: 3 },
  { id: "class", label: "Class", layer: 3 },
] as const;

const DEFAULT_JUMP = seedJumps.findIndex((j) => j.id === "j-02");

/**
 * The home story. One live figure (trajectory + throwable deck of class 9B's
 * jumps) stays pinned while five chapters scroll past and change what it shows.
 */
export function StoryStage({ classScene }: { classScene: React.ReactNode }) {
  const runs = useMemo(
    () =>
      seedJumps.map((j) => {
        const samples = traceFor(j);
        return { jump: j, samples, analysis: analyzeJump(samples) };
      }),
    []
  );
  const [index, setIndex] = useState(DEFAULT_JUMP);
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

  const run = runs[index];
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
        <nav aria-label="Chapters" className="mb-3 flex flex-wrap items-center gap-1">
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
        <section id="stand" className="min-h-[55vh] py-10">
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
            Throw the deck to flip through {lesson.className}: {runs.length} jumps from 6 students, recorded in about
            13 minutes on {lesson.date}. Best of the lesson so far is {studentName(best.jump.studentId)} at{" "}
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
