import lessonFixture from "../../fixtures/lesson-9b.json";
import pilotFixture from "../../fixtures/pilot-placeholder.json";
import type { Lesson, PilotRow, SeedJump, Student } from "@/lib/types";

// Seeded data for one PE lesson (class 9B, six students, two attempts each) and the
// PLACEHOLDER wall-mark pilot. The values live in fixtures/*.json; this module
// narrows the JSON types and is the only reader of those files.

export { traceFor } from "./trace";

type RawJump = (typeof lessonFixture.seedJumps)[number];
type RawRow = (typeof pilotFixture.rows)[number];

function toAttempt(v: number, id: string): SeedJump["attempt"] {
  if (v === 1 || v === 2 || v === 3) return v;
  throw new Error(`fixtures/lesson-9b.json: ${id} has attempt ${v}, expected 1, 2 or 3.`);
}

function toFps(v: number, id: string): SeedJump["fps"] {
  if (v === 25 || v === 30) return v;
  throw new Error(`fixtures/lesson-9b.json: ${id} has fps ${v}, expected 25 or 30.`);
}

function toJumper(v: string, id: string): PilotRow["jumper"] {
  if (v === "P1" || v === "P2") return v;
  throw new Error(`fixtures/pilot-placeholder.json: ${id} has jumper ${v}, expected P1 or P2.`);
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

export function studentName(id: string): string {
  return students.find((s) => s.id === id)?.name ?? "Unknown";
}
