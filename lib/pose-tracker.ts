// MediaPipe Pose Landmarker (lite, VIDEO mode) running in the browser.
// Keyless and serverless: the WASM runtime comes from jsDelivr and the model
// from Google's public model bucket, both cached by the browser after the
// first load. Import this module only from "use client" components.

import type { NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseSample } from "@/lib/jump-solver";

// Must match the exact version pinned in package.json.
const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/** Loads the landmarker once per page. Tries the GPU delegate, falls back to CPU. */
export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT);
      const make = (delegate: "GPU" | "CPU") =>
        vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })();
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}

/** BlazePose indices used by Saltara. */
export const LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export const SKELETON_EDGES: [number, number][] = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

export interface FramePose {
  sample: PoseSample;
  landmarks: NormalizedLandmark[];
  /** False when an ankle is out of frame or hidden. */
  feetVisible: boolean;
}

/**
 * Runs the landmarker on the current video frame. `mediaTime` is the frame's
 * presentation time from requestVideoFrameCallback (seconds); `timestampMs`
 * must increase strictly between calls.
 */
export function readPose(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  mediaTime: number,
  timestampMs: number
): FramePose | null {
  const result = landmarker.detectForVideo(video, timestampMs);
  const lm = result.landmarks[0];
  if (!lm) return null;
  const h = video.videoHeight;
  const mean = (i: number, j: number) => ((lm[i].y + lm[j].y) / 2) * h;
  const vis = (i: number) => lm[i].visibility ?? 1;
  return {
    sample: {
      t: mediaTime,
      hipY: mean(LANDMARK.leftHip, LANDMARK.rightHip),
      ankleY: mean(LANDMARK.leftAnkle, LANDMARK.rightAnkle),
    },
    landmarks: lm,
    feetVisible: vis(LANDMARK.leftAnkle) > 0.5 && vis(LANDMARK.rightAnkle) > 0.5,
  };
}
