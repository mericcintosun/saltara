import { adapterMode, getAdapter } from "@/lib/adapter";
import { coreError } from "@/lib/errors";
import type { ApiResponse, LessonPayload } from "@/lib/types";

// Mirrors what the pages read through the adapter. Default Node runtime.
// GET takes no input (no query, no body), so there is nothing for a zod schema to check.
export async function GET() {
  try {
    const data = await getAdapter().getLesson();
    const body: ApiResponse<LessonPayload> = { ok: true, mode: adapterMode(), source: "seed", data };
    return Response.json(body, { status: 200 });
  } catch {
    const { error, hint } = coreError("upstream_error", "The lesson could not be loaded. Reload the page in a moment.");
    const body: ApiResponse<LessonPayload> = { ok: false, error, hint };
    return Response.json(body, { status: 503 });
  }
}
