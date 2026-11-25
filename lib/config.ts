// The one place Saltara reads app config from process.env, and the home of every
// tuning constant of the measurement pipeline.
//
// This file holds no secrets and must never hold one: client components import it
// (the solver gates and the file-mode limits run in the browser). ADAPTER_MODE is
// a server-side switch; in the browser it reads as unset, and no client code
// branches on it.

import type { AdapterMode } from "@/lib/types";

/** "real" only for the exact string; anything else (or unset) is "fake". */
export const ADAPTER_MODE: AdapterMode = process.env.ADAPTER_MODE === "real" ? "real" : "fake";

/** Prefix of every core pipeline log line. */
export const CORE_LOG_PREFIX = "[core]";

// Pose engine loading (MediaPipe WASM and model from public CDNs).
export const POSE_LOAD_TIMEOUT_MS = 20000;
export const POSE_LOAD_RETRIES = 1;

// scripts/proof.mts HEAD checks against the engine URLs.
export const PROOF_FETCH_TIMEOUT_MS = 8000;

// Solver gates. Tune these here only; the values match the Phase 1 literals so the
// seeded results do not move.
export const MIN_AIRBORNE_FRAMES = 6;
export const MIN_R2 = 0.9;
/** Ankle rise that counts as airborne, as a fraction of the standing leg length in pixels. */
export const TAKEOFF_FRACTION_OF_LEG = 0.04;
/** Floor for the take-off threshold, pixels. */
export const TAKEOFF_MIN_PX = 6;
/** Hip range that counts as standing still, as a fraction of the leg length. */
export const STILL_FRACTION_OF_LEG = 0.03;
/** Time after landing before the live watcher analyses the jump, seconds. */
export const SETTLE_SECONDS = 0.35;
/** Lead-in kept before take-off in a live clip, seconds. */
export const PRE_TAKEOFF_SECONDS = 0.4;
/** Shoulder width may change by this fraction over a clip before the drift flag is set. */
export const SHOULDER_DRIFT_MAX = 0.05;

// Solver bookkeeping (same values as Phase 1).
/** Fewest samples analyzeJump accepts for a whole clip. */
export const MIN_CLIP_SAMPLES = 20;
/** Length of the standing baseline window at the start of a clip, seconds. */
export const STANDING_WINDOW_SECONDS = 0.5;
/** Ring buffer length of the live watcher, seconds. */
export const WATCHER_BUFFER_SECONDS = 4;
/** Frames the live watcher looks at to decide that the jumper stands still. */
export const WATCHER_STILL_FRAMES = 15;

// File mode (recorded clip).
export const MAX_CLIP_MB = 80;
export const MAX_CLIP_SECONDS = 20;
/**
 * Playback speed while a recorded clip is tracked. Slower than real time gives the
 * pose model room to see every frame; timestamps stay in media time, so the
 * physics is unchanged.
 */
export const FILE_PLAYBACK_RATE = 0.5;
