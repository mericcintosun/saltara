import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { StoryStage } from "@/components/story-stage";

export default function Home() {
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
          Saltara needs only the webcam that is already on the teacher&apos;s laptop. Below is a demo lesson: twelve
          jumps from class 9B, each rebuilt frame by frame at webcam frame rates with landmark jitter, and the real
          solver runs on every one of them in your browser. Scroll, and the figure follows the method one step at a time.
        </p>
      </div>

      <div className="mt-8">
        <StoryStage
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
