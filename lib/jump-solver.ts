// The gravity ruler. Pure math, no browser APIs, so it runs on the server for
// the seed jumps and in the browser for live camera jumps.
//
// Image y grows downward. While airborne the hip follows
//   y(t) = a t^2 + b t + c   with   a = (g / 2) * pxPerMetre
// so the curvature of the fitted parabola gives the pixel-to-metre scale with
// no calibration object in the frame.

export const G = 9.81;

/** One video frame reduced to what the solver needs. Heights are image pixels. */
export interface PoseSample {
  /** Frame timestamp in seconds (requestVideoFrameCallback mediaTime). */
  t: number;
  /** Mean of the left and right hip landmark y, in pixels. */
  hipY: number;
  /** Mean of the left and right ankle landmark y, in pixels. */
  ankleY: number;
}

export interface ParabolaFit {
  a: number;
  b: number;
  c: number;
  /** Time origin of the fit (t of the first airborne sample). */
  t0: number;
  r2: number;
}

export interface JumpEstimates {
  /** Airborne frame count times frame period, h = g T^2 / 8. */
  frameCountCm: number;
  /** Flight time from the fitted parabola's roots (sub-frame), h = g T^2 / 8. */
  flightTimeCm: number;
  /** Standing hip to apex, in metres via the gravity scale. Includes heel raise, like a wall-reach test. */
  displacementCm: number;
}

export interface JumpAnalysis {
  ok: boolean;
  /** Human-readable reason when ok is false. */
  reason: string | null;
  fps: number;
  standingHipY: number;
  standingAnkleY: number;
  /** Index of the first airborne sample, or -1. */
  takeoffIndex: number;
  /** Index of the first grounded sample after flight, or -1. */
  landingIndex: number;
  airborneFrames: number;
  fit: ParabolaFit | null;
  pxPerMetre: number | null;
  apex: { t: number; y: number } | null;
  /** Fitted take-off and landing instants (absolute seconds). */
  roots: [number, number] | null;
  estimates: JumpEstimates | null;
}

const MIN_AIRBORNE_FRAMES = 6;
const MIN_R2 = 0.9;

function median(values: number[]): number {
  const s = [...values].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Least squares y = a x^2 + b x + c through the 3x3 normal equations (Cramer's rule). */
export function fitParabola(xs: number[], ys: number[]): { a: number; b: number; c: number; r2: number } | null {
  const n = xs.length;
  if (n < 3) return null;
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    const x2 = x * x;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }
  // | s4 s3 s2 | |a|   |sx2y|
  // | s3 s2 s1 | |b| = |sxy |
  // | s2 s1 n  | |c|   |sy  |
  const det3 = (m: number[]) =>
    m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const D = det3([s4, s3, s2, s3, s2, s1, s2, s1, n]);
  if (Math.abs(D) < 1e-12) return null;
  const a = det3([sx2y, s3, s2, sxy, s2, s1, sy, s1, n]) / D;
  const b = det3([s4, sx2y, s2, s3, sxy, s1, s2, sy, n]) / D;
  const c = det3([s4, s3, sx2y, s3, s2, sxy, s2, s1, sy]) / D;

  const meanY = sy / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = a * xs[i] * xs[i] + b * xs[i] + c;
    ssRes += (ys[i] - pred) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  return { a, b, c, r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot };
}

export interface AnalyzeOptions {
  /** Known standing baseline (the live watcher captures it before take-off). */
  standingHipY?: number;
  standingAnkleY?: number;
}

export function analyzeJump(samples: PoseSample[], opts: AnalyzeOptions = {}): JumpAnalysis {
  const n = samples.length;
  const fps = n > 1 ? (n - 1) / (samples[n - 1].t - samples[0].t) : 0;
  const fail = (reason: string, partial: Partial<JumpAnalysis> = {}): JumpAnalysis => ({
    ok: false,
    reason,
    fps,
    standingHipY: partial.standingHipY ?? 0,
    standingAnkleY: partial.standingAnkleY ?? 0,
    takeoffIndex: partial.takeoffIndex ?? -1,
    landingIndex: partial.landingIndex ?? -1,
    airborneFrames: partial.airborneFrames ?? 0,
    fit: null,
    pxPerMetre: null,
    apex: null,
    roots: null,
    estimates: null,
  });

  if (n < 20) return fail("Not enough frames yet. Stand still for a second before jumping.");

  // 1. Standing baseline: the first half second, unless the caller already knows it.
  const standingWindow = samples.filter((s) => s.t - samples[0].t < 0.5);
  const standingHipY = opts.standingHipY ?? median(standingWindow.map((s) => s.hipY));
  const standingAnkleY = opts.standingAnkleY ?? median(standingWindow.map((s) => s.ankleY));
  const legPx = standingAnkleY - standingHipY;
  if (legPx <= 0) return fail("Hips and ankles are not both visible. Step back so your whole body is in frame.");

  // 2. Take-off and landing from ankle rise above the standing ankle.
  const threshold = Math.max(0.04 * legPx, 6);
  const rise = (s: PoseSample) => standingAnkleY - s.ankleY;
  const searchFrom = opts.standingHipY === undefined ? standingWindow.length : 0;
  let takeoffIndex = -1;
  for (let i = searchFrom; i < n; i++) {
    if (rise(samples[i]) > threshold) {
      takeoffIndex = i;
      break;
    }
  }
  if (takeoffIndex < 1) return fail("No take-off found in this clip.", { standingHipY, standingAnkleY });
  let landingIndex = -1;
  for (let j = takeoffIndex + 1; j < n; j++) {
    if (rise(samples[j]) <= threshold) {
      landingIndex = j;
      break;
    }
  }
  if (landingIndex < 0) return fail("No landing found yet.", { standingHipY, standingAnkleY, takeoffIndex });

  const airborne = samples.slice(takeoffIndex, landingIndex);
  const partial = { standingHipY, standingAnkleY, takeoffIndex, landingIndex, airborneFrames: airborne.length };
  if (airborne.length < MIN_AIRBORNE_FRAMES) {
    return fail(
      `Only ${airborne.length} airborne frames. Step back from the camera and add light so it holds at least 25 fps.`,
      partial
    );
  }

  // 3. Fit the parabola to the hip while airborne.
  const t0 = airborne[0].t;
  const raw = fitParabola(
    airborne.map((s) => s.t - t0),
    airborne.map((s) => s.hipY)
  );
  if (!raw) return fail("The flight points could not be fitted.", partial);
  if (raw.a <= 0) return fail("The hip did not fall like a free body. Jump straight up, not forward.", partial);
  if (raw.r2 < MIN_R2) {
    return fail(`Fit quality R² ${raw.r2.toFixed(2)} is below ${MIN_R2}. Try steadier light and a plain wall.`, partial);
  }
  const fit: ParabolaFit = { ...raw, t0 };

  // 4. Gravity gives the scale: a = (g / 2) * pxPerMetre.
  const pxPerMetre = (2 * fit.a) / G;
  const apexT = -fit.b / (2 * fit.a);
  const apexY = fit.c - (fit.b * fit.b) / (4 * fit.a);

  // 5. Take-off hip level. Assumes the body is rigid in flight, so hip + ankle rise
  //    stays constant. TODO: refine with the toe landmarks (31, 32) once tested on real clips.
  const yRef = median(airborne.map((s) => s.hipY + rise(s)));
  const disc = fit.b * fit.b - 4 * fit.a * (fit.c - yRef);
  if (disc <= 0) return fail("The fitted arc never reaches take-off height.", partial);
  const sq = Math.sqrt(disc);
  const r1 = (-fit.b - sq) / (2 * fit.a) + t0;
  const r2 = (-fit.b + sq) / (2 * fit.a) + t0;
  const flightFit = r2 - r1;
  const flightFrames = samples[landingIndex].t - samples[takeoffIndex].t;

  const toCm = (T: number) => ((G * T * T) / 8) * 100;
  const estimates: JumpEstimates = {
    frameCountCm: toCm(flightFrames),
    flightTimeCm: toCm(flightFit),
    displacementCm: ((standingHipY - apexY) / pxPerMetre) * 100,
  };

  return {
    ok: true,
    reason: null,
    fps,
    ...partial,
    fit,
    pxPerMetre,
    apex: { t: apexT + t0, y: apexY },
    roots: [r1, r2],
    estimates,
  };
}

/** The headline number: sub-frame flight time from the parabola. */
export function headlineCm(a: JumpAnalysis): number | null {
  return a.estimates ? a.estimates.flightTimeCm : null;
}

/**
 * Live jump watcher for the camera. Keeps a 4 second ring buffer, learns the
 * standing baseline while the jumper is still, and calls onJump once per landing.
 */
export function createJumpWatcher(onJump: (samples: PoseSample[], analysis: JumpAnalysis) => void) {
  let buf: PoseSample[] = [];
  let state: "ground" | "air" | "settling" = "ground";
  let baseline: { hip: number; ankle: number } | null = null;
  let takeoffAt = 0;
  let landedAt = 0;

  return {
    baseline: () => baseline,
    reset() {
      buf = [];
      state = "ground";
      baseline = null;
    },
    push(s: PoseSample) {
      buf.push(s);
      buf = buf.filter((x) => x.t > s.t - 4);
      if (buf.length < 15) return;

      if (state === "ground") {
        const recent = buf.slice(-15);
        const hips = recent.map((x) => x.hipY);
        const leg = baseline ? baseline.ankle - baseline.hip : median(recent.map((x) => x.ankleY)) - median(hips);
        const still = Math.max(...hips) - Math.min(...hips) < 0.03 * Math.max(leg, 1);
        if (still) baseline = { hip: median(hips), ankle: median(recent.map((x) => x.ankleY)) };
        if (baseline && baseline.ankle - s.ankleY > Math.max(0.04 * (baseline.ankle - baseline.hip), 6)) {
          state = "air";
          takeoffAt = s.t;
        }
      } else if (state === "air" && baseline) {
        if (baseline.ankle - s.ankleY <= Math.max(0.04 * (baseline.ankle - baseline.hip), 6)) {
          state = "settling";
          landedAt = s.t;
        }
      } else if (state === "settling" && baseline && s.t - landedAt > 0.35) {
        const clip = buf.filter((x) => x.t >= takeoffAt - 0.4);
        onJump(clip, analyzeJump(clip, { standingHipY: baseline.hip, standingAnkleY: baseline.ankle }));
        state = "ground";
      }
    },
  };
}

export interface BlandAltman {
  bias: number;
  sd: number;
  upper: number;
  lower: number;
  points: { mean: number; diff: number }[];
}

/** Bland-Altman agreement of a test method against a reference (test minus reference). */
export function blandAltman(pairs: { reference: number; test: number }[]): BlandAltman {
  const points = pairs.map((p) => ({ mean: (p.reference + p.test) / 2, diff: p.test - p.reference }));
  const bias = points.reduce((s, p) => s + p.diff, 0) / points.length;
  const sd = Math.sqrt(points.reduce((s, p) => s + (p.diff - bias) ** 2, 0) / Math.max(points.length - 1, 1));
  return { bias, sd, upper: bias + 1.96 * sd, lower: bias - 1.96 * sd, points };
}
