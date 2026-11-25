// The gravity ruler. Pure math, no browser APIs, so it runs on the server for
// the seed jumps and in the browser for live camera jumps.
//
// Image y grows downward. While airborne the hip follows
//   y(t) = a t^2 + b t + c   with   a = (g / 2) * pxPerMetre
// so the curvature of the fitted parabola gives the pixel-to-metre scale with
// no calibration object in the frame.
//
// Every gate lives in lib/config.ts. Rejections carry a typed CoreErrorCode.

import {
  CORE_LOG_PREFIX,
  MIN_AIRBORNE_FRAMES,
  MIN_CLIP_SAMPLES,
  MIN_R2,
  PRE_TAKEOFF_SECONDS,
  SETTLE_SECONDS,
  SHOULDER_DRIFT_MAX,
  STANDING_WINDOW_SECONDS,
  STILL_FRACTION_OF_LEG,
  TAKEOFF_FRACTION_OF_LEG,
  TAKEOFF_MIN_PX,
  WATCHER_BUFFER_SECONDS,
  WATCHER_STILL_FRAMES,
} from "@/lib/config";
import { hintFor, type CoreErrorCode } from "@/lib/errors";

export const G = 9.81;

/** One video frame reduced to what the solver needs. Heights are image pixels. */
export interface PoseSample {
  /** Frame timestamp in seconds (requestVideoFrameCallback mediaTime). */
  t: number;
  /** Mean of the left and right hip landmark y, in pixels. */
  hipY: number;
  /** Mean of the left and right ankle landmark y, in pixels. */
  ankleY: number;
  /** Shoulder width in pixels (live and file frames only), used by the drift flag. */
  shoulderW?: number;
}

export interface JumpFlags {
  /** Shoulder width changed by more than SHOULDER_DRIFT_MAX over the clip. */
  drift: boolean;
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
  /** Typed rejection code when ok is false, else null. */
  code: CoreErrorCode | null;
  /** Human-readable reason when ok is false. */
  reason: string | null;
  /** Soft warnings that keep the result. */
  flags: JumpFlags;
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

/** True when shoulder width (where known) changes by more than SHOULDER_DRIFT_MAX across the clip. */
export function shoulderDrift(samples: PoseSample[]): boolean {
  let lo = Infinity;
  let hi = -Infinity;
  let count = 0;
  for (const s of samples) {
    const w = s.shoulderW;
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) continue;
    count += 1;
    if (w < lo) lo = w;
    if (w > hi) hi = w;
  }
  if (count < 2) return false;
  return hi / lo > 1 + SHOULDER_DRIFT_MAX;
}

export function analyzeJump(samples: PoseSample[], opts: AnalyzeOptions = {}): JumpAnalysis {
  const n = samples.length;
  const fps = n > 1 ? (n - 1) / (samples[n - 1].t - samples[0].t) : 0;
  const flags: JumpFlags = { drift: shoulderDrift(samples) };
  const fail = (code: CoreErrorCode, partial: Partial<JumpAnalysis> = {}, reason: string = hintFor(code)): JumpAnalysis => {
    console.info(`${CORE_LOG_PREFIX} rejected`, { code });
    return {
      ok: false,
      code,
      reason,
      flags,
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
    };
  };

  if (n < MIN_CLIP_SAMPLES) {
    return fail("too_few_frames", {}, `Only ${n} frames so far. Stand still for a second before jumping.`);
  }

  // 1. Standing baseline: the first half second, unless the caller already knows it.
  const standingWindow = samples.filter((s) => s.t - samples[0].t < STANDING_WINDOW_SECONDS);
  const standingHipY = opts.standingHipY ?? median(standingWindow.map((s) => s.hipY));
  const standingAnkleY = opts.standingAnkleY ?? median(standingWindow.map((s) => s.ankleY));
  const legPx = standingAnkleY - standingHipY;
  if (legPx <= 0) return fail("feet_hidden");

  // 2. Take-off and landing from ankle rise above the standing ankle.
  const threshold = Math.max(TAKEOFF_FRACTION_OF_LEG * legPx, TAKEOFF_MIN_PX);
  const rise = (s: PoseSample) => standingAnkleY - s.ankleY;
  const searchFrom = opts.standingHipY === undefined ? standingWindow.length : 0;
  let takeoffIndex = -1;
  for (let i = searchFrom; i < n; i++) {
    if (rise(samples[i]) > threshold) {
      takeoffIndex = i;
      break;
    }
  }
  if (takeoffIndex < 1) {
    return fail("no_jump", { standingHipY, standingAnkleY }, "No take-off found in this clip. Stand still for a second, then jump straight up.");
  }
  console.info(`${CORE_LOG_PREFIX} take-off`, { frame: takeoffIndex, t: Number(samples[takeoffIndex].t.toFixed(3)) });
  let landingIndex = -1;
  for (let j = takeoffIndex + 1; j < n; j++) {
    if (rise(samples[j]) <= threshold) {
      landingIndex = j;
      break;
    }
  }
  if (landingIndex < 0) {
    return fail("no_jump", { standingHipY, standingAnkleY, takeoffIndex }, "No landing found in this clip yet.");
  }
  console.info(`${CORE_LOG_PREFIX} landing`, { frame: landingIndex, t: Number(samples[landingIndex].t.toFixed(3)) });

  const airborne = samples.slice(takeoffIndex, landingIndex);
  const partial = { standingHipY, standingAnkleY, takeoffIndex, landingIndex, airborneFrames: airborne.length };
  if (airborne.length < MIN_AIRBORNE_FRAMES) {
    return fail(
      "too_few_frames",
      partial,
      `Only ${airborne.length} airborne frames, at least ${MIN_AIRBORNE_FRAMES} are needed. Step back from the camera and add light so it holds at least 25 fps.`
    );
  }

  // 3. Fit the parabola to the hip while airborne.
  const t0 = airborne[0].t;
  const raw = fitParabola(
    airborne.map((s) => s.t - t0),
    airborne.map((s) => s.hipY)
  );
  if (!raw) return fail("low_fit", partial, "The flight points could not be fitted. Try steadier light and a plain wall.");
  if (raw.a <= 0) {
    return fail("low_fit", partial, "The hip did not fall like a free body. Jump straight up, not forward.");
  }
  if (raw.r2 < MIN_R2) {
    return fail(
      "low_fit",
      partial,
      `Fit quality R² ${raw.r2.toFixed(2)} is below ${MIN_R2}. Try steadier light and a plain wall.`
    );
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
  if (disc <= 0) return fail("low_fit", partial, "The fitted arc never reaches take-off height.");
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

  console.info(`${CORE_LOG_PREFIX} fit ok`, {
    frames: airborne.length,
    r2: Number(fit.r2.toFixed(3)),
    pxPerMetre: Math.round(pxPerMetre),
  });

  return {
    ok: true,
    code: null,
    reason: null,
    flags,
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
 * Live jump watcher for the camera. Keeps a short ring buffer, learns the
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
      buf = buf.filter((x) => x.t > s.t - WATCHER_BUFFER_SECONDS);
      if (buf.length < WATCHER_STILL_FRAMES) return;
      const threshold = (b: { hip: number; ankle: number }) =>
        Math.max(TAKEOFF_FRACTION_OF_LEG * (b.ankle - b.hip), TAKEOFF_MIN_PX);

      if (state === "ground") {
        const recent = buf.slice(-WATCHER_STILL_FRAMES);
        const hips = recent.map((x) => x.hipY);
        const leg = baseline ? baseline.ankle - baseline.hip : median(recent.map((x) => x.ankleY)) - median(hips);
        const still = Math.max(...hips) - Math.min(...hips) < STILL_FRACTION_OF_LEG * Math.max(leg, 1);
        if (still) baseline = { hip: median(hips), ankle: median(recent.map((x) => x.ankleY)) };
        if (baseline && baseline.ankle - s.ankleY > threshold(baseline)) {
          state = "air";
          takeoffAt = s.t;
        }
      } else if (state === "air" && baseline) {
        if (baseline.ankle - s.ankleY <= threshold(baseline)) {
          state = "settling";
          landedAt = s.t;
        }
      } else if (state === "settling" && baseline && s.t - landedAt > SETTLE_SECONDS) {
        const clip = buf.filter((x) => x.t >= takeoffAt - PRE_TAKEOFF_SECONDS);
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
