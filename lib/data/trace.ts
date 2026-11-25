import { G, type PoseSample } from "@/lib/jump-solver";
import type { SeedJump } from "@/lib/types";

// The transform from a seed jump's physical parameters to a per-frame trace.
// Moved unchanged from lib/data.ts: same PRNG, same constants, so the output is
// byte-identical and the real solver runs on it exactly as on camera frames.

/** Deterministic PRNG so server and browser render identical traces. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

const smooth = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};

/** Rebuilds the per-frame trace of a seed jump: stand, dip, fly, land, settle. */
export function traceFor(j: SeedJump): PoseSample[] {
  const rng = mulberry32(hashId(j.id));
  const gauss = () => {
    const u = Math.max(rng(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
  const pxm = j.pxPerMetre;
  const standingAnkle = j.standingHipY + 0.86 * pxm;
  const hipTakeoff = j.standingHipY - 0.06 * pxm; // heel raise lifts the hip before toe-off
  const dipPx = 0.18 * pxm;
  const flightT = Math.sqrt((8 * j.riseM) / G);
  const v0 = (G * flightT) / 2;
  const tTake = 1.02 + rng() * 0.05;
  const tLand = tTake + flightT;
  const dt = 1 / j.fps;
  const clipStart = 12 + rng() * 3; // mediaTime does not start at zero on a live camera

  const out: PoseSample[] = [];
  for (let k = 0; k * dt < 2.3; k++) {
    const t = k * dt + (rng() - 0.5) * 0.002;
    let hip: number;
    let airborne = false;
    if (t < 0.55) hip = j.standingHipY;
    else if (t < 0.85) hip = j.standingHipY + dipPx * smooth((t - 0.55) / 0.3);
    else if (t < tTake) hip = j.standingHipY + dipPx - (j.standingHipY + dipPx - hipTakeoff) * smooth((t - 0.85) / (tTake - 0.85));
    else if (t < tLand) {
      const s = t - tTake;
      hip = hipTakeoff - pxm * (v0 * s - 0.5 * G * s * s);
      airborne = true;
    } else if (t < tLand + 0.25) hip = hipTakeoff + (j.standingHipY + dipPx * 0.5 - hipTakeoff) * smooth((t - tLand) / 0.25);
    else hip = j.standingHipY + dipPx * 0.5 * (1 - smooth((t - tLand - 0.25) / 0.45));

    const ankle = airborne ? standingAnkle - (hipTakeoff - hip) : standingAnkle;
    out.push({
      t: clipStart + t,
      hipY: hip + gauss() * j.noisePx,
      ankleY: ankle + gauss() * j.noisePx,
    });
  }
  return out;
}
