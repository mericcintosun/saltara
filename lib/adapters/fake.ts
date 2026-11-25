import { lesson, pilotIsPlaceholder, pilotRows, seedJumps, students } from "@/lib/data/seed";
import type { LessonPayload, PilotPayload, SaltaraAdapter } from "@/lib/types";

export function seedLesson(): LessonPayload {
  return { lesson: { ...lesson }, students: [...students], jumps: [...seedJumps] };
}

export function seedPilot(): PilotPayload {
  return { rows: [...pilotRows], placeholder: pilotIsPlaceholder };
}

/**
 * Serves the seeded class 9B lesson and the placeholder pilot rows, and opens /play
 * on the seeded replay. The camera and file inputs still run the real pipeline.
 */
export const fakeAdapter: SaltaraAdapter = {
  getLesson: async () => seedLesson(),
  getPilot: async () => seedPilot(),
  describeSource: async () => ({
    mode: "fake",
    initialInput: "replay",
    label:
      "Sample data: seeded class 9B clips, rebuilt frame by frame. The live camera and file mode still measure for real.",
  }),
};
