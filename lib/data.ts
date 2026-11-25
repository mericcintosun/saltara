import { G, type PoseSample } from "@/lib/jump-solver";

// Seed data for one PE lesson: class 9B, six students, two attempts each.
// Each jump is stored as the physical parameters of a recorded clip; traceFor()
// rebuilds the per-frame hip and ankle heights (with webcam-like jitter) so the
// real solver runs on them exactly as it runs on camera frames.

export interface Student {
  id: string;
  name: string;
}

export interface SeedJump {
  id: string;
  studentId: string;
  attempt: 1 | 2 | 3;
  recordedAt: string;
  /** Camera frame rate the clip was captured at. */
  fps: 25 | 30;
  /** Ground-truth pixels per metre at the jumper's distance (unknown to the solver). */
  pxPerMetre: number;
  /** Standing hip height in image pixels (720 px tall frame). */
  standingHipY: number;
  /** Ground-truth rise of the hip from take-off to apex, metres. */
  riseM: number;
  /** Landmark jitter, pixels (1 sigma). */
  noisePx: number;
}

export const lesson = {
  className: "Year 9 PE, class 9B",
  teacher: "Coach Aylin Sahin",
  school: "Karsiyaka Secondary School",
  date: "2026-11-18",
};

export const students: Student[] = [
  { id: "s-elif", name: "Elif Kaya" },
  { id: "s-mateo", name: "Mateo Ruiz" },
  { id: "s-amara", name: "Amara Okafor" },
  { id: "s-jonas", name: "Jonas Weber" },
  { id: "s-priya", name: "Priya Nair" },
  { id: "s-can", name: "Can Demir" },
];

export const seedJumps: SeedJump[] = [
  { id: "j-01", studentId: "s-elif", attempt: 1, recordedAt: "2026-11-18T09:12:04", fps: 30, pxPerMetre: 410, standingHipY: 240, riseM: 0.318, noisePx: 1.4 },
  { id: "j-02", studentId: "s-elif", attempt: 2, recordedAt: "2026-11-18T09:12:41", fps: 30, pxPerMetre: 412, standingHipY: 242, riseM: 0.339, noisePx: 1.5 },
  { id: "j-03", studentId: "s-mateo", attempt: 1, recordedAt: "2026-11-18T09:14:10", fps: 30, pxPerMetre: 388, standingHipY: 252, riseM: 0.276, noisePx: 1.5 },
  { id: "j-04", studentId: "s-mateo", attempt: 2, recordedAt: "2026-11-18T09:14:52", fps: 30, pxPerMetre: 391, standingHipY: 250, riseM: 0.291, noisePx: 1.8 },
  { id: "j-05", studentId: "s-amara", attempt: 1, recordedAt: "2026-11-18T09:16:33", fps: 30, pxPerMetre: 436, standingHipY: 228, riseM: 0.392, noisePx: 1.3 },
  { id: "j-06", studentId: "s-amara", attempt: 2, recordedAt: "2026-11-18T09:17:05", fps: 30, pxPerMetre: 433, standingHipY: 230, riseM: 0.371, noisePx: 1.5 },
  { id: "j-07", studentId: "s-jonas", attempt: 1, recordedAt: "2026-11-18T09:19:20", fps: 25, pxPerMetre: 402, standingHipY: 246, riseM: 0.244, noisePx: 1.7 },
  { id: "j-08", studentId: "s-jonas", attempt: 2, recordedAt: "2026-11-18T09:19:58", fps: 25, pxPerMetre: 405, standingHipY: 244, riseM: 0.262, noisePx: 1.9 },
  { id: "j-09", studentId: "s-priya", attempt: 1, recordedAt: "2026-11-18T09:21:44", fps: 30, pxPerMetre: 421, standingHipY: 236, riseM: 0.301, noisePx: 1.4 },
  { id: "j-10", studentId: "s-priya", attempt: 2, recordedAt: "2026-11-18T09:22:19", fps: 30, pxPerMetre: 418, standingHipY: 238, riseM: 0.289, noisePx: 1.6 },
  { id: "j-11", studentId: "s-can", attempt: 1, recordedAt: "2026-11-18T09:24:02", fps: 30, pxPerMetre: 377, standingHipY: 258, riseM: 0.352, noisePx: 1.7 },
  { id: "j-12", studentId: "s-can", attempt: 2, recordedAt: "2026-11-18T09:24:37", fps: 30, pxPerMetre: 380, standingHipY: 256, riseM: 0.368, noisePx: 2.0 },
];

export function studentName(id: string): string {
  return students.find((s) => s.id === id)?.name ?? "Unknown";
}

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

/**
 * Pilot agreement table for the notes page. PLACEHOLDER ROWS: these are
 * illustrative values shaped like the planned pilot (2 jumpers, chalk
 * jump-and-reach on a wall vs the three Saltara estimates). Replace them with
 * the real pilot before the submission; the notes page says so on screen.
 */
export interface PilotRow {
  id: string;
  jumper: "P1" | "P2";
  wallCm: number;
  frameCountCm: number;
  flightTimeCm: number;
  displacementCm: number;
}

export const pilotIsPlaceholder = true;

export const pilotRows: PilotRow[] = [
  [31.5, 26.9, 25.8, 30.4], [38.0, 30.1, 31.9, 36.7], [27.2, 22.0, 21.4, 26.8], [44.6, 41.2, 38.3, 43.1],
  [35.1, 27.5, 29.0, 34.9], [29.8, 25.3, 23.7, 27.6], [41.3, 33.8, 35.2, 40.8], [33.0, 29.6, 27.1, 31.2],
  [24.9, 17.8, 19.4, 24.1], [47.2, 40.0, 41.6, 45.0], [36.4, 31.7, 30.2, 35.8], [30.7, 23.1, 24.9, 29.9],
  [42.8, 38.4, 36.6, 40.5], [26.3, 21.9, 20.5, 25.7], [39.5, 31.0, 33.3, 38.9], [33.9, 28.2, 28.0, 33.4],
  [28.4, 24.6, 22.1, 26.9], [45.9, 37.5, 40.2, 44.3], [32.2, 26.4, 26.6, 31.5], [37.7, 34.1, 31.4, 36.0],
  [34.8, 27.9, 28.9, 33.1], [40.1, 32.6, 34.5, 39.6],
].map(([wallCm, frameCountCm, flightTimeCm, displacementCm], i): PilotRow => ({
  id: `p-${String(i + 1).padStart(2, "0")}`,
  jumper: i % 2 === 0 ? "P1" : "P2",
  wallCm,
  frameCountCm,
  flightTimeCm,
  displacementCm,
}));
