import type { Metadata } from "next";
import { JumpLab } from "@/components/jump-lab";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = {
  title: "Jump lab",
  description: "Measure a vertical jump with your webcam, or replay the demo class, and keep a class list with CSV export.",
};

export default async function PlayPage() {
  const payload = await getAdapter().getLesson();

  return (
    <div className="mx-auto max-w-3xl px-5 pt-12">
      <h1 className="saltara-wipe text-4xl font-extrabold sm:text-5xl">Jump lab</h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed">
        The tool without the story. Turn on the camera and jump, or replay one of the {payload.jumps.length} seeded demo
        jumps from {payload.lesson.className}. Every result shows the three height estimates and the scale that gravity
        gave, and can be saved to the class list below.
      </p>
      <div className="mt-10">
        <JumpLab lesson={payload} />
      </div>
    </div>
  );
}
