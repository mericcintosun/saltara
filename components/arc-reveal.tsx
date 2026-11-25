"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { animated, useSprings } from "@react-spring/web";
import { plotGeometry, TrajectoryPlot } from "@/components/trajectory-plot";
import type { JumpAnalysis, PoseSample } from "@/lib/jump-solver";

/** Gap between two airborne points dropping onto the plot, in ms. */
export const DROP_STAGGER_MS = 45;

/**
 * The Mission 3 reveal on /play. The airborne hip points drop onto the plot one
 * by one, then the fitted parabola wipes in over them (M4 wipe). The first render
 * (and the server HTML) shows everything in its final place; the reveal plays only
 * when `revealKey` changes after mount, or on mount when `animateOnMount` is set
 * because the result arrived after the page loaded.
 */
export function ArcReveal({
  samples,
  analysis,
  revealKey,
  animateOnMount = false,
}: {
  samples: PoseSample[];
  analysis: JumpAnalysis;
  revealKey: string;
  animateOnMount?: boolean;
}) {
  const g = useMemo(() => plotGeometry(samples, analysis), [samples, analysis]);
  const finals = useMemo(() => g.airborne.map((i) => g.py(samples[i].hipY)), [g, samples]);
  const n = finals.length;

  const [springs, api] = useSprings(n, (i) => ({ cy: finals[i] }));
  const lastKey = useRef<string | null>(animateOnMount ? null : revealKey);
  const token = useRef(0);
  const [settledKey, setSettledKey] = useState<string | null>(animateOnMount ? null : revealKey);
  const [wipe, setWipe] = useState(false);

  // Layout effect: the points move to the top before the browser paints the new jump.
  useLayoutEffect(() => {
    if (lastKey.current === revealKey) return;
    lastKey.current = revealKey;
    const mine = ++token.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    api.stop();
    if (reduce || n === 0) {
      api.start((i) => ({ cy: finals[i], immediate: true }));
      setWipe(false);
      setSettledKey(revealKey);
      return;
    }
    setWipe(true);
    const settle = () => {
      if (token.current === mine) setSettledKey(revealKey);
    };
    api.set({ cy: g.pad.t });
    api.start((i) => ({
      cy: finals[i],
      delay: i * DROP_STAGGER_MS,
      config: { tension: 320, friction: 20 },
      onRest: i === n - 1 ? settle : undefined,
    }));
    // Safety net: the arc still appears if the last spring never reports rest.
    // Not cleared on cleanup (StrictMode re-runs this effect); the token drops stale calls.
    window.setTimeout(settle, n * DROP_STAGGER_MS + 1500);
  }, [revealKey, api, finals, n, g]);

  if (!analysis.fit || samples.length < 2) {
    return <TrajectoryPlot samples={samples} analysis={analysis} layer={3} />;
  }

  const { W, H, pad, px, py, arc, baseY, apex } = g;
  const firstAir = g.airborne[0] ?? -1;
  const isAir = (i: number) => firstAir >= 0 && i >= firstAir && i <= g.airborne[n - 1];
  const settled = settledKey === revealKey;

  return (
    <div className="overflow-x-auto rounded-2xl">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Hip height over time during the jump, with the fitted flight parabola"
        className="h-auto w-full min-w-[20rem] rounded-2xl bg-card"
      >
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b + 8} y2={H - pad.b + 8} className="stroke-border" strokeWidth={2} strokeLinecap="round" />
        <text x={W - pad.r} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[11px]">
          time
        </text>
        <text x={pad.l} y={14} className="fill-muted-foreground text-[11px]">
          hip height (higher is up)
        </text>

        {analysis.standingHipY > 0 && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={baseY} y2={baseY} className="stroke-muted-foreground" strokeDasharray="3 6" strokeWidth={1.5} />
            <text x={W - pad.r} y={baseY - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
              standing hip
            </text>
          </g>
        )}

        {samples.map((s, i) =>
          isAir(i) ? null : <circle key={i} cx={px(s.t)} cy={py(s.hipY)} r={3} className="fill-muted-foreground/45" />
        )}
        {g.airborne.map((sampleIndex, k) => {
          const s = samples[sampleIndex];
          const spring = springs[k];
          return spring ? (
            <animated.circle key={`air-${sampleIndex}`} cx={px(s.t)} cy={spring.cy} r={4.5} className="fill-primary" />
          ) : (
            <circle key={`air-${sampleIndex}`} cx={px(s.t)} cy={py(s.hipY)} r={4.5} className="fill-primary" />
          );
        })}

        {settled && arc && (
          <g key={revealKey} className={wipe ? "saltara-wipe" : undefined}>
            <path d={arc} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
            {apex && analysis.pxPerMetre && (
              <g>
                <circle cx={px(apex.t)} cy={py(apex.y)} r={7} className="fill-sun" />
                <text x={px(apex.t) + 12} y={py(apex.y) + 4} className="fill-foreground text-[12px] font-bold">
                  scale from gravity: {Math.round(analysis.pxPerMetre)} px/m
                </text>
              </g>
            )}
            {apex && analysis.estimates && (
              <g>
                <line x1={px(apex.t)} x2={px(apex.t)} y1={py(apex.y) + 9} y2={baseY} className="stroke-sun" strokeWidth={3} strokeLinecap="round" />
                <text x={px(apex.t) - 10} y={(py(apex.y) + baseY) / 2 + 4} textAnchor="end" className="fill-foreground text-[12px] font-bold">
                  {analysis.estimates.displacementCm.toFixed(1)} cm standing to apex
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
