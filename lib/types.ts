// Shared types for the Saltara data path:
// fixtures/*.json -> lib/data/seed.ts -> lib/adapter.ts -> page -> client component.

export type { PoseSample } from "@/lib/jump-solver";

export interface Student {
  id: string;
  name: string;
}

export interface SeedJump {
  id: string;
  studentId: string;
  attempt: 1 | 2 | 3;
  recordedAt: string;
  /** Camera frame rate the clip was captured at. */
  fps: 25 | 30;
  /** Ground-truth pixels per metre at the jumper's distance (unknown to the solver). */
  pxPerMetre: number;
  /** Standing hip height in image pixels (720 px tall frame). */
  standingHipY: number;
  /** Ground-truth rise of the hip from take-off to apex, metres. */
  riseM: number;
  /** Landmark jitter, pixels (1 sigma). */
  noisePx: number;
}

/**
 * One row of the wall-mark pilot. While `PilotPayload.placeholder` is true these
 * are illustrative values, not measurements, and the notes page says so.
 */
export interface PilotRow {
  id: string;
  jumper: "P1" | "P2";
  wallCm: number;
  frameCountCm: number;
  flightTimeCm: number;
  displacementCm: number;
}

export interface Lesson {
  className: string;
  teacher: string;
  school: string;
  date: string;
}

export interface LessonPayload {
  lesson: Lesson;
  students: Student[];
  jumps: SeedJump[];
}

export interface PilotPayload {
  rows: PilotRow[];
  placeholder: boolean;
}

export type AdapterMode = "fake" | "real";

/** The one response shape shared by every /api route. */
export type ApiResponse<T> = {
  ok: true;
  mode: AdapterMode;
  source: "seed" | "pilot" | "live";
  data: T;
};

export interface SaltaraAdapter {
  getLesson(): Promise<LessonPayload>;
  getPilot(): Promise<PilotPayload>;
}
