import { fakeAdapter } from "@/lib/adapters/fake";
import { realAdapter } from "@/lib/adapters/real";
import { ADAPTER_MODE } from "@/lib/config";
import type { AdapterMode, SaltaraAdapter } from "@/lib/types";

// The selector, and the only file that branches on the adapter mode. Pages and
// /api routes call getAdapter(); they never import lib/adapters/* directly.

/** "real" only for the exact string ADAPTER_MODE=real; anything else is "fake". */
export function adapterMode(): AdapterMode {
  return ADAPTER_MODE;
}

export function getAdapter(): SaltaraAdapter {
  return adapterMode() === "real" ? realAdapter : fakeAdapter;
}
