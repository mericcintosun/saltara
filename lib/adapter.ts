import { fakeAdapter } from "@/lib/adapters/fake";
import { realAdapter } from "@/lib/adapters/real";
import { ADAPTER_MODE, CORE_LOG_PREFIX } from "@/lib/config";
import type { AdapterMode, SaltaraAdapter } from "@/lib/types";

// The selector, and the only file that branches on the adapter mode. Pages and
// /api routes call getAdapter(); they never import lib/adapters/* directly.

/** "real" only for the exact string ADAPTER_MODE=real; anything else is "fake". */
export function adapterMode(): AdapterMode {
  return ADAPTER_MODE;
}

/**
 * Wraps every method of `primary` so a throw or a rejected promise falls back to the
 * same method on `fallback`, with one [core] line naming the method.
 */
export function withFallback(primary: SaltaraAdapter, fallback: SaltaraAdapter): SaltaraAdapter {
  const guard =
    <T>(method: keyof SaltaraAdapter, run: () => Promise<T>, backup: () => Promise<T>) =>
    async (): Promise<T> => {
      try {
        return await run();
      } catch {
        console.info(`${CORE_LOG_PREFIX} fallback`, { method });
        return backup();
      }
    };
  return {
    getLesson: guard("getLesson", () => primary.getLesson(), () => fallback.getLesson()),
    getPilot: guard("getPilot", () => primary.getPilot(), () => fallback.getPilot()),
    describeSource: guard("describeSource", () => primary.describeSource(), () => fallback.describeSource()),
  };
}

export function getAdapter(): SaltaraAdapter {
  return adapterMode() === "real" ? withFallback(realAdapter, fakeAdapter) : fakeAdapter;
}
