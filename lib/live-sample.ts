import type { PoseSample } from "@/lib/jump-solver";
import { LANDMARK, type FramePose } from "@/lib/pose-tracker";

// Turns one tracked frame into a solver sample with the shoulder width that the
// drift flag needs. lib/pose-tracker.ts stays untouched; it already exports
// LANDMARK.leftShoulder (11) and LANDMARK.rightShoulder (12).

export function toSample(pose: FramePose, videoWidth: number): PoseSample {
  const lm = pose.landmarks;
  const left = lm[LANDMARK.leftShoulder];
  const right = lm[LANDMARK.rightShoulder];
  const sample: PoseSample = { ...pose.sample };
  if (left && right && videoWidth > 0) {
    const w = Math.abs(left.x - right.x) * videoWidth;
    if (Number.isFinite(w) && w > 0) sample.shoulderW = w;
  }
  return sample;
}
