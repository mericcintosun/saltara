import { describe, expect, it } from "vitest";
import { SEED_VERSION } from "@/lib/data/seed";
import {
  addAttempt,
  addStudent,
  isDuplicateAttempt,
  parseStored,
  resetState,
  storageKey,
  type ClassState,
} from "@/lib/store";

const VERSION = "abc12345";

function seed(): ClassState {
  return {
    version: 2,
    seedVersion: VERSION,
    activeId: "s-elif",
    roster: [
      {
        id: "s-elif",
        name: "Elif",
        attempts: [
          { key: "seed:j-01", cm: 32, origin: "seed" },
          { key: "seed:j-02", cm: 33.6, origin: "seed" },
        ],
      },
      { id: "s-noah", name: "Noah", attempts: [] },
    ],
  };
}

const countAttempts = (s: ClassState) => s.roster.reduce((n, st) => n + st.attempts.length, 0);

describe("class store", () => {
  it("returns duplicate for the same key saved twice and keeps the count", () => {
    const first = addAttempt(seed(), "s-noah", { key: "live-1", cm: 30.04, origin: "camera" });
    expect(first.outcome).toBe("saved");
    expect(first.state.roster[1].attempts[0].cm).toBe(30);
    const second = addAttempt(first.state, "s-noah", { key: "live-1", cm: 30.04, origin: "camera" });
    expect(second.outcome).toBe("duplicate");
    expect(countAttempts(second.state)).toBe(countAttempts(first.state));
    // The key is checked against every student, not only the one saving.
    expect(addAttempt(first.state, "s-elif", { key: "live-1", cm: 30, origin: "camera" }).outcome).toBe("duplicate");
    expect(isDuplicateAttempt(first.state, "live-1")).toBe(true);
  });

  it("returns full on a fourth attempt", () => {
    const third = addAttempt(seed(), "s-elif", { key: "clip-1", cm: 34, origin: "file" });
    expect(third.outcome).toBe("saved");
    const fourth = addAttempt(third.state, "s-elif", { key: "clip-2", cm: 35, origin: "file" });
    expect(fourth.outcome).toBe("full");
    expect(fourth.state.roster[0].attempts).toHaveLength(3);
  });

  it("returns no_student for an unknown id", () => {
    expect(addAttempt(seed(), "s-nobody", { key: "x", cm: 20, origin: "camera" }).outcome).toBe("no_student");
  });

  it("parseStored returns null for corrupt JSON", () => {
    expect(parseStored("{not json", VERSION)).toBeNull();
    expect(parseStored(null, VERSION)).toBeNull();
  });

  it("parseStored returns null for a mismatched seed version", () => {
    const raw = JSON.stringify(seed());
    expect(parseStored(raw, VERSION)).toEqual(seed());
    expect(parseStored(raw, "ffffffff")).toBeNull();
  });

  it("parseStored returns null for a v1 shaped blob", () => {
    const v1 = JSON.stringify({ roster: [{ id: "s-elif", name: "Elif", attempts: [32, 33.6] }], activeId: "s-elif" });
    expect(parseStored(v1, VERSION)).toBeNull();
  });

  it("resetState deep equals the seed and does not share objects with it", () => {
    const s = seed();
    const r = resetState(s);
    expect(r).toEqual(s);
    expect(r.roster).not.toBe(s.roster);
    expect(r.roster[0].attempts[0]).not.toBe(s.roster[0].attempts[0]);
  });

  it("addStudent appends and selects the new student", () => {
    const next = addStudent(seed(), "  Mira ", "s-mira");
    expect(next.roster.at(-1)).toEqual({ id: "s-mira", name: "Mira", attempts: [] });
    expect(next.activeId).toBe("s-mira");
  });

  it("derives a stable 8 hex digit seed version and a versioned key", () => {
    expect(SEED_VERSION).toMatch(/^[0-9a-f]{8}$/);
    expect(storageKey(SEED_VERSION)).toBe(`saltara.class.v2:${SEED_VERSION}`);
  });
});
