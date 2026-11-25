import lessonFixture from "../../fixtures/lesson-9b.json";
import realPilotFixture from "../../fixtures/pilot.json";
import pilotFixture from "../../fixtures/pilot-placeholder.json";
import type { Lesson, PilotRow, SeedJump, Student } from "@/lib/types";

// Seeded data for one PE lesson (class 9B, six students, two attempts each), the
// PLACEHOLDER wall-mark pilot, and the slot for the real pilot (fixtures/pilot.json).
// The values live in fixtures/*.json; this module narrows the JSON types and is the
// only reader of those files.

export { traceFor } from "./trace";

type RawJump = (typeof lessonFixture.seedJumps)[number];
type RawRow = (typeof pilotFixture.rows)[number];

/**
 * FNV-1a 32-bit over the UTF-16 code units of a string, as 8 hex digits.
 * scripts/demo-reset.mjs computes the same hash; keep the two in step.
 */
export function fnv1a32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Hash of the lesson fixture. No clock, no randomness: same fixture, same version. */
export const SEED_VERSION: string = fnv1a32(JSON.stringify(lessonFixture));

function toAttempt(v: number, id: string): SeedJump["attempt"] {
  if (v === 1 || v === 2 || v === 3) return v;
  throw new Error(`fixtures/lesson-9b.json: ${id} has attempt ${v}, expected 1, 2 or 3.`);
}

function toFps(v: number, id: string): SeedJump["fps"] {
  if (v === 25 || v === 30) return v;
  throw new Error(`fixtures/lesson-9b.json: ${id} has fps ${v}, expected 25 or 30.`);
}

function toJumper(v: unknown, id: string, file = "fixtures/pilot-placeholder.json"): PilotRow["jumper"] {
  if (v === "P1" || v === "P2") return v;
  throw new Error(`${file}: ${id} has jumper ${String(v)}, expected P1 or P2.`);
}

function toCm(v: unknown, id: string, field: string, file: string): number {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 150) return v;
  throw new Error(`${file}: ${id} has ${field} ${String(v)}, expected a number from 0 to 150.`);
}

/** Same guards as the placeholder rows, plus the id and range checks scripts/seed.mjs applies. */
function toRealPilotRow(raw: unknown): PilotRow {
  const file = "fixtures/pilot.json";
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const id = typeof r.id === "string" && /^p-\d{2}$/.test(r.id) ? r.id : null;
  if (!id) throw new Error(`${file}: bad row id ${JSON.stringify(r.id)}, expected p-NN.`);
  return {
    id,
    jumper: toJumper(r.jumper, id, file),
    wallCm: toCm(r.wallCm, id, "wallCm", file),
    frameCountCm: toCm(r.frameCountCm, id, "frameCountCm", file),
    flightTimeCm: toCm(r.flightTimeCm, id, "flightTimeCm", file),
    displacementCm: toCm(r.displacementCm, id, "displacementCm", file),
  };
}

function toSeedJump(r: RawJump): SeedJump {
  return {
    id: r.id,
    studentId: r.studentId,
    attempt: toAttempt(r.attempt, r.id),
    recordedAt: r.recordedAt,
    fps: toFps(r.fps, r.id),
    pxPerMetre: r.pxPerMetre,
    standingHipY: r.standingHipY,
    riseM: r.riseM,
    noisePx: r.noisePx,
  };
}

function toPilotRow(r: RawRow): PilotRow {
  return {
    id: r.id,
    jumper: toJumper(r.jumper, r.id),
    wallCm: r.wallCm,
    frameCountCm: r.frameCountCm,
    flightTimeCm: r.flightTimeCm,
    displacementCm: r.displacementCm,
  };
}

export const lesson: Lesson = { ...lessonFixture.lesson };

export const students: Student[] = lessonFixture.students.map((s) => ({ id: s.id, name: s.name }));

export const seedJumps: SeedJump[] = lessonFixture.seedJumps.map(toSeedJump);

/** PLACEHOLDER pilot rows while `pilotIsPlaceholder` is true; the notes page labels them. */
export const pilotRows: PilotRow[] = pilotFixture.rows.map(toPilotRow);

export const pilotIsPlaceholder: boolean = pilotFixture.placeholder;

/** Real wall-mark rows from the human pilot session; empty until that session is in. */
const rawRealRows: unknown[] = realPilotFixture.rows;
export const realPilotRows: PilotRow[] = rawRealRows.map(toRealPilotRow);

export function studentName(id: string): string {
  return students.find((s) => s.id === id)?.name ?? "Unknown";
}
