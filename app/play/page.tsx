import type { Metadata } from "next";
import { JumpLab } from "@/components/jump-lab";

export const metadata: Metadata = {
  title: "Jump lab | Saltara",
  description: "Measure a vertical jump with your webcam, or replay the demo class, and keep a class list with CSV export.",
};

export default function PlayPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-12">
      <h1 className="saltara-wipe text-4xl font-extrabold sm:text-5xl">Jump lab</h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed">
        The tool without the story. Turn on the camera and jump, or replay one of the twelve demo jumps from class 9B.
        Every result shows the three height estimates and the scale that gravity gave, and can be saved to the class
        list below.
      </p>
      <div className="mt-10">
        <JumpLab />
      </div>
    </div>
  );
}
