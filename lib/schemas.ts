import { z } from "zod";
import { MAX_CLIP_MB } from "@/lib/config";

// Validation at the edges of the measurement pipeline: the file a user picks and
// the samples collected from it, before analyzeJump sees them.

export const PoseSampleSchema = z.object({
  t: z.number().finite(),
  hipY: z.number().finite(),
  ankleY: z.number().finite(),
  shoulderW: z.number().finite().positive().optional(),
});

export const JumpTraceSchema = z
  .array(PoseSampleSchema)
  .min(10)
  .max(2000)
  .refine((samples) => samples.every((s, i) => i === 0 || s.t > samples[i - 1].t), {
    message: "Sample times must strictly increase.",
  });

/** Checks a picked File (or anything shaped like one) by MIME type and size. */
export const VideoFileSchema = z.object({
  name: z.string(),
  type: z.string().startsWith("video/"),
  size: z
    .number()
    .positive()
    .max(MAX_CLIP_MB * 1024 * 1024),
});

export type VideoFileInput = z.infer<typeof VideoFileSchema>;
