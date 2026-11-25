import { lesson, pilotIsPlaceholder, pilotRows, seedJumps, students } from "@/lib/data/seed";
import type { AdapterMode, LessonPayload, PilotPayload, SaltaraAdapter } from "@/lib/types";

// The adapter seam. Pages and /api routes read the lesson and the pilot through
// getAdapter(), never from the fixtures directly, so Phase 2 can swap the source
// without touching a page.

/** "real" only for the exact string; anything else (or unset) is "fake". */
export function adapterMode(): AdapterMode {
  return process.env.ADAPTER_MODE === "real" ? "real" : "fake";
}

function seedLesson(): LessonPayload {
  return { lesson: { ...lesson }, students: [...students], jumps: [...seedJumps] };
}

function seedPilot(): PilotPayload {
  return { rows: [...pilotRows], placeholder: pilotIsPlaceholder };
}

/** Serves the seeded class 9B lesson and the placeholder pilot rows. */
export const fakeAdapter: SaltaraAdapter = {
  getLesson: async () => seedLesson(),
  getPilot: async () => seedPilot(),
};

// Phase 2: live jumps are measured in the browser and join the same /play result
// path on the client, so the lesson stays seeded here. The real pilot replaces
// fixtures/pilot-placeholder.json (placeholder: false) rather than a network call.
export const realAdapter: SaltaraAdapter = {
  getLesson: async () => seedLesson(),
  getPilot: async () => seedPilot(),
};

export function getAdapter(): SaltaraAdapter {
  return adapterMode() === "real" ? realAdapter : fakeAdapter;
}
