import { seedLesson, seedPilot } from "@/lib/adapters/fake";
import type { SaltaraAdapter } from "@/lib/types";

/**
 * The live engine. Measurement happens in the browser (MediaPipe Pose Landmarker
 * lite plus the gravity solver), so this adapter only decides that /play opens on
 * the camera. The lesson stays seeded (it is the demo class), and the pilot stays
 * on the labelled placeholder until a human session replaces
 * fixtures/pilot-placeholder.json.
 */
export const realAdapter: SaltaraAdapter = {
  getLesson: async () => seedLesson(),
  getPilot: async () => seedPilot(),
  describeSource: async () => ({
    mode: "real",
    initialInput: "camera",
    label: "Live engine: MediaPipe Pose Landmarker lite runs in this browser and gravity sets the scale. No key, no server.",
  }),
};
