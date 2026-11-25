import { MAX_CLIP_MB, MAX_CLIP_SECONDS } from "@/lib/config";

// Typed failure codes for the measurement pipeline. The UI switches on `error`,
// never on message text.

export type CoreErrorCode =
  | "invalid_input"
  | "upstream_timeout"
  | "upstream_error"
  | "parse_failure"
  | "not_configured"
  | "too_few_frames"
  | "low_fit"
  | "feet_hidden"
  | "drift"
  | "no_jump";

export interface CoreError {
  error: CoreErrorCode;
  hint: string;
}

const HINTS: Record<CoreErrorCode, string> = {
  invalid_input: `That file is not a video this browser can read, or it is over ${MAX_CLIP_MB} MB or ${MAX_CLIP_SECONDS} seconds. Pick a short clip of one jump.`,
  upstream_timeout: "The pose model took too long to download. Check the connection and press Start again.",
  upstream_error: "The pose model could not start in this browser. Try a recent Chrome, Edge or Safari, or replay a recorded jump.",
  parse_failure: "The clip gave too few usable frames. Use a clip of a few seconds with the whole body in view the whole time.",
  not_configured: "This input is not available here. Replay a recorded jump instead.",
  too_few_frames: "Too few airborne frames. Step back from the camera and add light so it holds at least 25 fps.",
  low_fit: "The flight points do not follow a clean arc. Try steadier light and a plain wall.",
  feet_hidden: "Hips and ankles are not both visible. Step back so your whole body is in frame.",
  drift: "You moved toward or away from the camera, treat this height with care.",
  no_jump: "No take-off and landing found. Stand still for a second, then jump straight up.",
};

/** One human sentence per code. */
export function hintFor(code: CoreErrorCode): string {
  return HINTS[code];
}

export function coreError(code: CoreErrorCode, hint: string = hintFor(code)): CoreError {
  return { error: code, hint };
}

export function isCoreError(v: unknown): v is CoreError {
  return typeof v === "object" && v !== null && "error" in v && "hint" in v && typeof (v as CoreError).hint === "string";
}
