import { adapterMode, getAdapter } from "@/lib/adapter";
import type { ApiResponse, LessonPayload } from "@/lib/types";

// Mirrors what the pages read through the adapter. Default Node runtime.
export async function GET() {
  const data = await getAdapter().getLesson();
  const body: ApiResponse<LessonPayload> = { ok: true, mode: adapterMode(), source: "seed", data };
  return Response.json(body, { status: 200 });
}
