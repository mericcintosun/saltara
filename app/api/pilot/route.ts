import { adapterMode, getAdapter } from "@/lib/adapter";
import type { ApiResponse, PilotPayload } from "@/lib/types";

// Mirrors what /notes reads through the adapter. Default Node runtime.
export async function GET() {
  const data = await getAdapter().getPilot();
  const body: ApiResponse<PilotPayload> = {
    ok: true,
    mode: adapterMode(),
    source: data.placeholder ? "seed" : "pilot",
    data,
  };
  return Response.json(body, { status: 200 });
}
