import { z } from "zod";

// The class list store. Pure functions plus three guarded storage calls; nothing
// touches `window` at module level, so Vitest imports this file under node.
// These three calls (readClassState, writeClassState, clearClassState) are the
// only code in the repo that reads or writes browser storage.

export const MAX_ATTEMPTS = 3;

const KEY_PREFIX = "saltara.class.";
const LEGACY_KEY = "saltara.class.v1";

export type AttemptOrigin = "seed" | "camera" | "file";

export interface RosterAttempt {
  /** `seed:<jump id>` for a seeded replay, a random UUID for a camera or clip measurement. */
  key: string;
  /** Flight-time height in cm, one decimal. */
  cm: number;
  origin: AttemptOrigin;
}

export interface RosterStudent {
  id: string;
  name: string;
  /** Up to MAX_ATTEMPTS attempts. */
  attempts: RosterAttempt[];
}

export interface ClassState {
  version: 2;
  /** FNV-1a hash of the lesson fixture; a changed fixture discards stale browser state. */
  seedVersion: string;
  roster: RosterStudent[];
  activeId: string | null;
}

export type SaveOutcome = "saved" | "duplicate" | "full" | "no_student";

const RosterAttemptSchema = z.object({
  key: z.string().min(1),
  cm: z.number().finite().min(0).max(200),
  origin: z.enum(["seed", "camera", "file"]),
});

const RosterStudentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  attempts: z.array(RosterAttemptSchema).max(MAX_ATTEMPTS),
});

export const ClassStateSchema = z.object({
  version: z.literal(2),
  seedVersion: z.string().min(1),
  roster: z.array(RosterStudentSchema),
  activeId: z.string().nullable(),
});

export function storageKey(seedVersion: string): string {
  return `saltara.class.v2:${seedVersion}`;
}

/** A stored blob, or null when it is missing, not JSON, the wrong shape or from another seed. */
export function parseStored(raw: string | null, seedVersion: string): ClassState | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = ClassStateSchema.safeParse(json);
  if (!parsed.success) return null;
  if (parsed.data.seedVersion !== seedVersion) return null;
  return parsed.data;
}

/** True when any student already holds an attempt with this key (the idempotency check). */
export function isDuplicateAttempt(state: ClassState, key: string): boolean {
  return state.roster.some((s) => s.attempts.some((a) => a.key === key));
}

export function addAttempt(
  state: ClassState,
  studentId: string,
  attempt: RosterAttempt
): { state: ClassState; outcome: SaveOutcome } {
  if (isDuplicateAttempt(state, attempt.key)) return { state, outcome: "duplicate" };
  const student = state.roster.find((s) => s.id === studentId);
  if (!student) return { state, outcome: "no_student" };
  if (student.attempts.length >= MAX_ATTEMPTS) return { state, outcome: "full" };
  const cm = Math.round(attempt.cm * 10) / 10;
  return {
    state: {
      ...state,
      roster: state.roster.map((s) =>
        s.id === studentId ? { ...s, attempts: [...s.attempts, { ...attempt, cm }] } : s
      ),
    },
    outcome: "saved",
  };
}

/** Adds a student and makes them the one who jumps next. */
export function addStudent(state: ClassState, name: string, id: string): ClassState {
  const clean = name.trim();
  if (!clean || state.roster.some((s) => s.id === id)) return state;
  return { ...state, roster: [...state.roster, { id, name: clean, attempts: [] }], activeId: id };
}

/** A deep copy of the seed, so later edits never reach the seed object. */
export function resetState(seed: ClassState): ClassState {
  return {
    version: 2,
    seedVersion: seed.seedVersion,
    activeId: seed.activeId,
    roster: seed.roster.map((s) => ({ id: s.id, name: s.name, attempts: s.attempts.map((a) => ({ ...a })) })),
  };
}

export function bestOf(s: RosterStudent): number | null {
  return s.attempts.length ? Math.max(...s.attempts.map((a) => a.cm)) : null;
}

/** Reads this seed's class list from the browser, and drops the legacy v1 entry. */
export function readClassState(seedVersion: string): ClassState | null {
  if (typeof window === "undefined") return null;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    return parseStored(window.localStorage.getItem(storageKey(seedVersion)), seedVersion);
  } catch {
    // Storage blocked (private mode, quota): the seed stays on screen.
    return null;
  }
}

export function writeClassState(state: ClassState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(state.seedVersion), JSON.stringify(state));
  } catch {
    // Storage blocked or full: the list still works for this page view.
  }
}

/** Removes every Saltara class list on this browser (all seed versions and the legacy key). */
export function clearClassState(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
