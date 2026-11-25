import type { BlandAltman } from "@/lib/jump-solver";

/** Bland-Altman agreement plot: difference against mean, with bias and 95% limits. */
export function BlandAltmanPlot({ stats, label }: { stats: BlandAltman; label: string }) {
  const W = 600;
  const H = 300;
  const pad = { l: 44, r: 20, t: 20, b: 36 };
  const means = stats.points.map((p) => p.mean);
  const xMin = Math.floor(Math.min(...means) - 2);
  const xMax = Math.ceil(Math.max(...means) + 2);
  const span = Math.max(Math.abs(stats.upper), Math.abs(stats.lower), ...stats.points.map((p) => Math.abs(p.diff))) + 2;
  const yMin = -span;
  const yMax = span;
  const px = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const py = (y: number) => pad.t + ((yMax - y) / (yMax - yMin)) * (H - pad.t - pad.b);
  const ticks = [-Math.round(span * 0.75), 0, Math.round(span * 0.75)];

  const line = (y: number, text: string, cls: string, dash?: string) => (
    <g>
      <line x1={pad.l} x2={W - pad.r} y1={py(y)} y2={py(y)} className={cls} strokeWidth={2} strokeDasharray={dash} />
      <text x={W - pad.r} y={py(y) - 6} textAnchor="end" className="fill-foreground text-[11px] font-bold">
        {text}
      </text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full rounded-2xl bg-card">
      {ticks.map((t) => (
        <text key={t} x={pad.l - 8} y={py(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
          {t > 0 ? `+${t}` : t}
        </text>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={py(0)} y2={py(0)} className="stroke-border" strokeWidth={1.5} />
      {line(stats.upper, `+1.96 SD ${stats.upper.toFixed(1)} cm`, "stroke-muted-foreground", "4 6")}
      {line(stats.lower, `-1.96 SD ${stats.lower.toFixed(1)} cm`, "stroke-muted-foreground", "4 6")}
      {line(stats.bias, `bias ${stats.bias.toFixed(1)} cm`, "stroke-primary")}
      {stats.points.map((p, i) => (
        <circle key={i} cx={px(p.mean)} cy={py(p.diff)} r={5} className="fill-primary" />
      ))}
      <text x={(pad.l + W - pad.r) / 2} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        mean of both methods (cm), {xMin} to {xMax}
      </text>
      <text x={12} y={(pad.t + H - pad.b) / 2} transform={`rotate(-90 12 ${(pad.t + H - pad.b) / 2})`} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        Saltara minus wall (cm)
      </text>
    </svg>
  );
}
