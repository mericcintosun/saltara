import { adapterMode, getAdapter } from "@/lib/adapter";
import { coreError } from "@/lib/errors";
import type { ApiResponse, PilotPayload } from "@/lib/types";

// Mirrors what /notes reads through the adapter. Default Node runtime.
// GET takes no input (no query, no body), so there is nothing for a zod schema to check.
export async function GET() {
  try {
    const data = await getAdapter().getPilot();
    const body: ApiResponse<PilotPayload> = {
      ok: true,
      mode: adapterMode(),
      source: data.placeholder ? "seed" : "pilot",
      data,
    };
    return Response.json(body, { status: 200 });
  } catch {
    const { error, hint } = coreError("upstream_error", "The pilot rows could not be loaded. Reload the page in a moment.");
    const body: ApiResponse<PilotPayload> = { ok: false, error, hint };
    return Response.json(body, { status: 503 });
  }
}
