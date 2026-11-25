import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { CORE_LOG_PREFIX, POSE_LOAD_RETRIES, POSE_LOAD_TIMEOUT_MS } from "@/lib/config";
import { coreError, type CoreError } from "@/lib/errors";
import { loadPoseLandmarker } from "@/lib/pose-tracker";

// Loads the in-browser pose engine with a timeout and a bounded retry, and turns
// every failure into a typed CoreError. Import from "use client" code only.
//
// loadPoseLandmarker() memoises its promise but clears it on rejection, so the
// retry starts a fresh download. After a timeout the first attempt may still be
// pending, in which case the retry waits on that same promise (see HANDOFF.md).

class EngineTimeout extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new EngineTimeout(`no answer after ${ms} ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export async function loadEngine(): Promise<PoseLandmarker | CoreError> {
  const started = performance.now();
  console.info(`${CORE_LOG_PREFIX} engine loading`);
  let last: CoreError = coreError("upstream_error");
  for (let attempt = 0; attempt <= POSE_LOAD_RETRIES; attempt++) {
    try {
      const landmarker = await withTimeout(loadPoseLandmarker(), POSE_LOAD_TIMEOUT_MS);
      console.info(`${CORE_LOG_PREFIX} engine ready ${Math.round(performance.now() - started)}`);
      return landmarker;
    } catch (e) {
      last = coreError(e instanceof EngineTimeout ? "upstream_timeout" : "upstream_error");
    }
  }
  console.info(`${CORE_LOG_PREFIX} engine failed ${last.error}`);
  return last;
}
