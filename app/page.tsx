import type { Metadata } from "next";
import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { StoryStage } from "@/components/story-stage";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = {
  title: "Story",
  description: "Five chapters walk one recorded jump through the gravity ruler, from standing still to a class list.",
};

export default async function Home() {
  const payload = await getAdapter().getLesson();
  const { lesson, jumps } = payload;

  return (
    <article className="mx-auto max-w-prose px-5 pt-12">
      <header className="saltara-wipe">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">A field note from a PE class with no equipment budget</p>
        <h1 className="mt-4 text-5xl font-extrabold leading-[1.02] sm:text-6xl">Gravity is the only ruler you need</h1>
        <p className="mt-6 text-xl leading-relaxed">
          Jump in front of a laptop camera and Saltara measures the height in centimetres. No mat, no force plate, no
          tape measure, no calibration: the curve of your own flight tells it how big a metre is.
        </p>
      </header>

      <p className="mt-6 text-lg leading-relaxed">
        For PE teachers and coaches with a laptop and no equipment budget: one student jumps, Saltara gives the height
        in centimetres about a second after landing, and the whole class downloads as a CSV.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-6 text-lg">
        <Link
          href="#stand"
          className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-sun decoration-2 underline-offset-4"
        >
          Start with chapter one
        </Link>
        <Link
          href="/play"
          className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-sun decoration-2 underline-offset-4"
        >
          Open the jump lab
        </Link>
      </p>

      <div className="mt-10 overflow-hidden rounded-3xl">
        <SceneSlot
          n={1}
          alt="A teenager mid-jump in front of a school gym wall while a laptop on a bench traces the arc of the hip as a dotted curve"
          width={960}
          height={640}
        />
      </div>

      <div className="mt-10 space-y-5 text-lg leading-relaxed">
        <p>
          The vertical jump is the fitness test schools reach for first when they want to know about leg power. The
          tools that measure it well, force plates and contact mats, cost hundreds to thousands of dollars. The best
          known phone app asks for slow-motion video and a person who picks the take-off and landing frames by hand.
          So in most PE lessons the jump gets a chalk mark on the wall, or it does not get measured at all.
        </p>
        <p>
          Saltara needs only the webcam that is already on the teacher&apos;s laptop. Below is a seeded demo lesson:{" "}
          {jumps.length} jumps from {lesson.className}, each rebuilt frame by frame at webcam frame rates with landmark
          jitter, and the real solver runs on every one of them in your browser. Scroll, and the figure follows the
          method one step at a time.
        </p>
      </div>

      <div className="mt-8">
        <StoryStage
          lesson={payload}
          classScene={
            <SceneSlot
              n={2}
              alt="A PE teacher at a folding table with a laptop showing a class list while three students wait in line by a painted floor mark"
              width={960}
              height={600}
            />
          }
        />
      </div>

      <aside className="mt-16 rounded-3xl bg-secondary p-6 text-base leading-relaxed">
        <p>
          The method, the formulas, the quality gates and the pilot plan against wall marks are written up in the{" "}
          <Link href="/notes" className="font-bold text-primary underline decoration-sun decoration-2 underline-offset-4">
            notes
          </Link>
          .
        </p>
      </aside>
    </article>
  );
}
