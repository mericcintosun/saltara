import type { JumpAnalysis, PoseSample } from "@/lib/jump-solver";
import { cn } from "@/lib/utils";

/**
 * Hip height over time for one jump. `layer` reveals the method step by step:
 * 0 raw trace, 1 airborne frames, 2 fitted parabola and gravity scale,
 * 3 the three height estimates.
 */
export function TrajectoryPlot({
  samples,
  analysis,
  layer = 3,
  className,
}: {
  samples: PoseSample[];
  analysis: JumpAnalysis;
  layer?: 0 | 1 | 2 | 3;
  className?: string;
}) {
  const W = 600;
  const H = 280;
  const pad = { l: 16, r: 16, t: 24, b: 30 };
  if (samples.length < 2) {
    return (
      <div className={cn("flex aspect-[600/280] items-center justify-center rounded-2xl bg-card text-sm text-muted-foreground", className)}>
        Waiting for the first frames.
      </div>
    );
  }
  const t0 = samples[0].t;
  const t1 = samples[samples.length - 1].t;
  const ys = samples.map((s) => s.hipY);
  const yMin = Math.min(...ys, analysis.apex?.y ?? Infinity) - 14;
  const yMax = Math.max(...ys) + 14;
  const px = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const py = (y: number) => pad.t + ((y - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);

  const isAir = (i: number) => analysis.takeoffIndex >= 0 && i >= analysis.takeoffIndex && i < analysis.landingIndex;

  let arc = "";
  if (analysis.fit && analysis.roots) {
    const { a, b, c, t0: ft0 } = analysis.fit;
    const [r1, r2] = analysis.roots;
    const steps = 48;
    for (let k = 0; k <= steps; k++) {
      const t = r1 + ((r2 - r1) * k) / steps;
      const x = t - ft0;
      arc += `${k === 0 ? "M" : "L"}${px(t).toFixed(1)},${py(a * x * x + b * x + c).toFixed(1)} `;
    }
  }

  const baseY = py(analysis.standingHipY);
  const apex = analysis.apex;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Hip height over time during the jump, with the fitted flight parabola"
      className={cn("h-auto w-full rounded-2xl bg-card", className)}
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

      {samples.map((s, i) => (
        <circle
          key={i}
          cx={px(s.t)}
          cy={py(s.hipY)}
          r={layer >= 1 && isAir(i) ? 4.5 : 3}
          className={layer >= 1 && isAir(i) ? "fill-primary" : "fill-muted-foreground/45"}
        />
      ))}

      {layer >= 2 && arc && (
        <g key={`fit-${layer}`} className="saltara-wipe">
          <path d={arc} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
          {apex && analysis.pxPerMetre && (
            <g>
              <circle cx={px(apex.t)} cy={py(apex.y)} r={7} className="fill-sun" />
              <text x={px(apex.t) + 12} y={py(apex.y) + 4} className="fill-foreground text-[12px] font-bold">
                scale from gravity: {Math.round(analysis.pxPerMetre)} px/m
              </text>
            </g>
          )}
        </g>
      )}

      {layer >= 3 && apex && analysis.estimates && (
        <g className="saltara-wipe">
          <line x1={px(apex.t)} x2={px(apex.t)} y1={py(apex.y) + 9} y2={baseY} className="stroke-sun" strokeWidth={3} strokeLinecap="round" />
          <text x={px(apex.t) - 10} y={(py(apex.y) + baseY) / 2 + 4} textAnchor="end" className="fill-foreground text-[12px] font-bold">
            {analysis.estimates.displacementCm.toFixed(1)} cm standing to apex
          </text>
        </g>
      )}
    </svg>
  );
}
