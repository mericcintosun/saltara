import type { Metadata } from "next";
import Link from "next/link";
import { HeroArc } from "@/components/hero-arc";
import { SceneSlot } from "@/components/scene-slot";
import { StoryStage } from "@/components/story-stage";
import { Button } from "@/components/ui/button";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = {
  title: "Story",
  description: "Five chapters walk one recorded jump through the gravity ruler, from standing still to a class list.",
};

export default async function Home() {
  const payload = await getAdapter().getLesson();
  const { lesson, jumps } = payload;

  return (
    <article className="mx-auto max-w-prose px-5 pt-8 sm:pt-12">
      <p className="text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">
        Field note, {lesson.className}
      </p>
      <h1 className="saltara-wipe mt-3 text-[2.5rem] leading-[1.02] sm:text-6xl font-extrabold">
        Gravity is the only ruler you need
      </h1>
      <p className="mt-4 text-lg leading-relaxed sm:text-xl">
        For PE teachers with a laptop and no equipment budget: jump in front of the camera and Saltara gives the height
        in centimetres, using the curve of your own flight as the ruler.
      </p>

      <div aria-hidden className="saltara-rule-line mt-6" />

      <div className="mt-6">
        <HeroArc lesson={payload} />
      </div>

      <p className="mt-6">
        <Button asChild size="lg">
          <Link href="#stand">Start with chapter one</Link>
        </Button>
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
          Force plates and contact mats cost hundreds to thousands of dollars, so in most PE lessons the jump gets a chalk
          mark on the wall or no measurement at all.
        </p>
        <p>
          Below is a seeded demo lesson of {jumps.length} jumps from {lesson.className}, rebuilt frame by frame with
          webcam jitter, and the real solver runs on every one of them in your browser as you scroll.
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
