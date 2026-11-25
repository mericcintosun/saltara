import { seedLesson, seedPilot } from "@/lib/adapters/fake";
import { realPilotRows } from "@/lib/data/seed";
import type { PilotPayload, SaltaraAdapter } from "@/lib/types";

/** The pilot needs at least this many real wall-mark jumps before it replaces the placeholder. */
const MIN_REAL_PILOT_ROWS = 20;

/**
 * The real pilot when fixtures/pilot.json holds a full session; otherwise the named
 * fallback branch serves the labelled placeholder rows.
 */
function realOrPlaceholderPilot(): PilotPayload {
  if (realPilotRows.length >= MIN_REAL_PILOT_ROWS) {
    return { rows: [...realPilotRows], placeholder: false };
  }
  return placeholderPilotFallback();
}

/** Fallback: fewer than 20 real rows, so the placeholder (labelled on /notes) stays. */
function placeholderPilotFallback(): PilotPayload {
  return seedPilot();
}

/**
 * The live engine. Measurement happens in the browser (MediaPipe Pose Landmarker
 * lite plus the gravity solver), so this adapter decides that /play opens on the
 * camera. The lesson stays seeded (it is the demo class). The pilot reads the real
 * slot in fixtures/pilot.json once a human session fills it.
 */
export const realAdapter: SaltaraAdapter = {
  getLesson: async () => seedLesson(),
  getPilot: async () => realOrPlaceholderPilot(),
  describeSource: async () => ({
    mode: "real",
    initialInput: "camera",
    label: "Live engine: MediaPipe Pose Landmarker lite runs in this browser and gravity sets the scale. No key, no server.",
  }),
};
