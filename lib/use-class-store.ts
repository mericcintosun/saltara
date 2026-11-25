"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addAttempt,
  addStudent as addStudentTo,
  clearClassState,
  readClassState,
  resetState,
  writeClassState,
  type ClassState,
  type RosterAttempt,
  type SaveOutcome,
} from "@/lib/store";

/**
 * The single source of class data on /play. One effect hydrates from this laptop's
 * storage, one persists every change; all writes go through lib/store.ts.
 * `save` reads the latest state from a ref, so a double click sees the first save
 * and returns "duplicate" instead of adding the attempt twice.
 */
export function useClassStore(seed: ClassState) {
  const [state, setState] = useState<ClassState>(seed);
  const [ready, setReady] = useState(false);
  const latest = useRef<ClassState>(seed);

  const commit = useCallback((next: ClassState) => {
    latest.current = next;
    setState(next);
  }, []);

  // Hydrate: a stored list for this seed version wins; anything else keeps the seed.
  useEffect(() => {
    const stored = readClassState(seed.seedVersion);
    if (stored) commit(stored);
    setReady(true);
  }, [seed.seedVersion, commit]);

  // Persist: only after hydration, so the seed never overwrites a stored list.
  useEffect(() => {
    if (ready) writeClassState(state);
  }, [state, ready]);

  const save = useCallback(
    (studentId: string, attempt: RosterAttempt): SaveOutcome => {
      const result = addAttempt(latest.current, studentId, attempt);
      if (result.outcome === "saved") commit(result.state);
      return result.outcome;
    },
    [commit]
  );

  const addStudent = useCallback(
    (name: string) => commit(addStudentTo(latest.current, name, `s-${Date.now().toString(36)}`)),
    [commit]
  );

  const select = useCallback((id: string) => commit({ ...latest.current, activeId: id }), [commit]);

  const reset = useCallback(() => {
    clearClassState();
    commit(resetState(seed));
  }, [seed, commit]);

  return { state, ready, save, addStudent, select, reset };
}
