"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { animated, to, useSpring } from "@react-spring/web";
import { plotGeometry, TrajectoryPlot } from "@/components/trajectory-plot";
import { traceFor } from "@/lib/data/trace";
import { analyzeJump, headlineCm } from "@/lib/jump-solver";
import type { LessonPayload } from "@/lib/types";

const HERO_JUMP_ID = "j-02";
const MAX_TILT_DEG = 4;
const PULL = { tension: 320, friction: 24 };

/**
 * Kit K4 signature 3: the seeded j-02 arc on the first screen. The sun dot is pulled
 * along the fitted parabola toward the pointer, the panel tilts toward it, and the
 * sentence under it reads the hip height at that instant. Keyboard: it is a slider
 * (arrow keys step one airborne frame, Home and End jump to the edges).
 * Server HTML: the dot sits at the apex and the sentence shows the apex values.
 */
export function HeroArc({ lesson: payload }: { lesson: LessonPayload }) {
  const { lesson, students, jumps } = payload;
  const jump = jumps.find((j) => j.id === HERO_JUMP_ID) ?? jumps[0];

  const run = useMemo(() => {
    if (!jump) return null;
    const samples = traceFor(jump);
    return { samples, analysis: analyzeJump(samples, { quiet: true }) };
  }, [jump]);

  const [frame, setFrame] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const model = useMemo(() => {
    if (!run) return null;
    const { samples, analysis: a } = run;
    if (!a.ok || !a.fit || !a.roots || !a.apex || !a.pxPerMetre) return null;
    const geo = plotGeometry(samples, a);
    if (geo.airborne.length === 0) return null;
    const { a: qa, b: qb, c: qc, t0 } = a.fit;
    const fitY = (t: number) => {
      const x = t - t0;
      return qa * x * x + qb * x + qc;
    };
    const pxPerMetre = a.pxPerMetre;
    const point = (t: number, y: number) => ({
      left: (geo.px(t) / geo.W) * 100,
      top: (geo.py(y) / geo.H) * 100,
      cm: Math.max(0, ((a.standingHipY - y) / pxPerMetre) * 100),
      seconds: Math.max(0, t - a.roots![0]),
    });
    const apexT = a.apex.t;
    const apexIndex = geo.airborne.reduce(
      (best, i) => (Math.abs(samples[i].t - apexT) < Math.abs(samples[best].t - apexT) ? i : best),
      geo.airborne[0]
    );
    return {
      geo,
      samples,
      analysis: a,
      apex: point(a.apex.t, a.apex.y),
      apexIndex,
      at: (i: number) => point(samples[i].t, fitY(samples[i].t)),
      headline: headlineCm(a) ?? 0,
      pxPerMetre: Math.round(pxPerMetre),
    };
  }, [run]);

  const here = model ? (frame === null ? model.apex : model.at(frame)) : null;

  const [pull, pullApi] = useSpring(() => ({
    left: here?.left ?? 50,
    top: here?.top ?? 50,
    cm: here?.cm ?? 0,
    rx: 0,
    ry: 0,
    config: PULL,
  }));
  const [count, countApi] = useSpring(() => ({ h: model?.headline ?? 0 }));

  // The headline counts up once after hydration; the server HTML already shows the final value.
  const counted = useRef(false);
  useEffect(() => {
    if (!model || counted.current) return;
    counted.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    countApi.start({ from: { h: 0 }, to: { h: model.headline }, config: { tension: 120, friction: 26 } });
  }, [model, countApi]);

  const hereLeft = here?.left;
  const hereTop = here?.top;
  const hereCm = here?.cm;
  useEffect(() => {
    if (hereLeft === undefined || hereTop === undefined || hereCm === undefined) return;
    pullApi.start({ left: hereLeft, top: hereTop, cm: hereCm, immediate: reduced });
  }, [hereLeft, hereTop, hereCm, pullApi, reduced]);

  if (!run || !jump) return null;
  if (!model || !here) {
    return (
      <div className="rounded-3xl bg-card p-4 sm:p-6">
        <TrajectoryPlot samples={run.samples} analysis={run.analysis} layer={3} />
      </div>
    );
  }

  const name = students.find((s) => s.id === jump.studentId)?.name ?? "the jumper";
  const first = name.split(" ")[0];
  const { airborne } = model.geo;
  const lo = airborne[0];
  const hi = airborne[airborne.length - 1];
  const now = frame ?? model.apexIndex;
  const sentence = `At ${here.seconds.toFixed(2)} s into the flight ${first}'s hip is ${here.cm.toFixed(1)} cm above standing; Saltara reports ${model.headline.toFixed(1)} cm for the jump, and gravity set the scale at ${model.pxPerMetre} px/m.`;

  const nearest = (clientX: number) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return model.apexIndex;
    const x = ((clientX - box.left) / box.width) * model.geo.W;
    return airborne.reduce(
      (best, i) =>
        Math.abs(model.geo.px(model.samples[i].t) - x) < Math.abs(model.geo.px(model.samples[best].t) - x) ? i : best,
      lo
    );
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    setFrame(nearest(e.clientX));
    if (reduced) return;
    const box = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - box.left) / box.width - 0.5;
    const fy = (e.clientY - box.top) / box.height - 0.5;
    const clamp = (v: number) => Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, v));
    pullApi.start({ rx: clamp(-fy * 2 * MAX_TILT_DEG), ry: clamp(fx * 2 * MAX_TILT_DEG) });
  };

  const onPointerLeave = () => {
    setFrame(null);
    pullApi.start({ rx: 0, ry: 0, immediate: reduced });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = (d: number) => Math.min(hi, Math.max(lo, now + d));
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = step(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = step(-1);
    else if (e.key === "Home") next = lo;
    else if (e.key === "End") next = hi;
    if (next === null) return;
    e.preventDefault();
    setFrame(next);
  };

  return (
    <figure className="w-full">
      <animated.div
        role="slider"
        tabIndex={0}
        aria-label="Scrub through the seeded jump"
        aria-valuemin={lo}
        aria-valuemax={hi}
        aria-valuenow={now}
        aria-valuetext={sentence}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
        onBlur={() => setFrame(null)}
        style={{
          touchAction: "pan-y",
          transform: to(
            [pull.rx, pull.ry],
            (rx, ry) => `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
          ),
        }}
        className="relative cursor-crosshair overflow-hidden rounded-3xl bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
      >
        <span aria-hidden className="pointer-events-none absolute -left-6 -top-6 size-24 rounded-tr-full rounded-bl-full bg-deep" />
        <span aria-hidden className="pointer-events-none absolute -bottom-5 -right-4 size-16 rounded-tl-full rounded-br-full bg-deep" />
        <div ref={plotRef} className="relative">
          <TrajectoryPlot samples={model.samples} analysis={model.analysis} layer={3} />
          <animated.span
            aria-hidden
            className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun ring-4 ring-background"
            style={{ left: pull.left.to((v) => `${v}%`), top: pull.top.to((v) => `${v}%`) }}
          />
        </div>
      </animated.div>
      <figcaption className="mt-4 text-lg leading-relaxed">
        <span aria-hidden>
          At {here.seconds.toFixed(2)} s into the flight {first}&apos;s hip is{" "}
          <animated.span className="font-bold tabular-nums text-primary">{pull.cm.to((v) => v.toFixed(1))}</animated.span>{" "}
          cm above standing; Saltara reports{" "}
          <animated.span className="font-bold tabular-nums">{count.h.to((v) => v.toFixed(1))}</animated.span> cm for the
          jump, and gravity set the scale at {model.pxPerMetre} px/m.
        </span>
        <span className="sr-only">{sentence}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          Seeded jump {jump.id} of {lesson.className}, solved live in this page. Move the pointer over the arc or use the
          arrow keys.
        </span>
      </figcaption>
    </figure>
  );
}
