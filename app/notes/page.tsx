import type { Metadata } from "next";
import Link from "next/link";
import { BlandAltmanPlot } from "@/components/bland-altman-plot";
import { SceneSlot } from "@/components/scene-slot";
import { Badge } from "@/components/ui/badge";
import { pilotIsPlaceholder, pilotRows } from "@/lib/data";
import { blandAltman, G } from "@/lib/jump-solver";

export const metadata: Metadata = {
  title: "Notes | Saltara",
  description: "Method, formulas, quality gates, the wall-mark pilot and the tech behind Saltara.",
};

function Fold({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-3xl bg-card px-6 py-4">
      <summary className="flex cursor-pointer list-none items-center gap-3 font-bold">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sun" />
        {summary}
      </summary>
      <div className="mt-4 space-y-3 leading-relaxed">{children}</div>
    </details>
  );
}

export default function NotesPage() {
  const disp = blandAltman(pilotRows.map((r) => ({ reference: r.wallCm, test: r.displacementCm })));
  const flight = blandAltman(pilotRows.map((r) => ({ reference: r.wallCm, test: r.flightTimeCm })));
  const frames = blandAltman(pilotRows.map((r) => ({ reference: r.wallCm, test: r.frameCountCm })));
  const f1 = (v: number) => v.toFixed(1);

  return (
    <article className="mx-auto max-w-prose px-5 pt-12">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Appendix</p>
      <h1 className="saltara-wipe mt-3 text-4xl font-extrabold sm:text-5xl">Method notes</h1>
      <p className="mt-5 text-lg leading-relaxed">
        How Saltara turns a webcam clip into centimetres, where it can go wrong, and how we plan to check it against
        the chalk mark that PE teachers already trust.
      </p>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-bold">The gravity ruler</h2>
        <p className="leading-relaxed">
          In the air, the hip follows a parabola in image pixels: y = at² + bt + c, fitted by least squares to the
          airborne frames using the real frame timestamps from requestVideoFrameCallback. Gravity fixes the curvature,
          a = (g/2) × s, so the scale s = 2a / g pixels per metre comes out of the fit with g = {G} m/s². No cone, no
          ruler, no typed body height.
        </p>
        <Fold summary="Three heights from one fit">
          <p>
            <strong>Frame counting.</strong> Airborne frames times the frame period gives a flight time T, and h = gT²/8.
            At 30 fps T is only known to within 33 ms.
          </p>
          <p>
            <strong>Parabola flight time (reported).</strong> The two roots of the fitted parabola at take-off hip height
            land between frames, so T is no longer tied to the frame grid. Same formula, h = gT²/8. It does not use the
            scale at all.
          </p>
          <p>
            <strong>Standing hip to apex.</strong> (standing hip y minus apex y) / s. This is the one that needs the
            gravity scale, and it includes the heel raise before toe-off, like a wall-reach test. It also guards against
            the known flight-time error when someone lands with bent knees.
          </p>
        </Fold>
        <Fold summary="Quality gates that reject a jump">
          <p>Fewer than 6 airborne frames: the camera is too slow or too close. The lab asks the jumper to step back.</p>
          <p>Fit R² below 0.9, or a parabola that opens the wrong way: the landmarks were too noisy or the jump drifted.</p>
          <p>Hips and ankles not both visible: the baseline cannot be set.</p>
        </Fold>
      </section>

      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-bold">Agreement with a chalk wall mark</h2>
        {pilotIsPlaceholder && (
          <p className="rounded-2xl bg-secondary p-4 text-sm">
            <Badge variant="warn" className="mr-2">
              Placeholder data
            </Badge>
            The 22 rows below are illustrative values shaped like the planned pilot, not measurements. They will be
            replaced by our own session: 2 jumpers, at least 20 jumps, chalk jump-and-reach and tape against the three
            Saltara estimates.
          </p>
        )}
        <BlandAltmanPlot stats={disp} label="Bland-Altman plot of standing-to-apex height against the wall mark" />
        <p className="leading-relaxed">
          On these rows the standing-to-apex height sits {f1(disp.bias)} cm from the wall mark on average, with 95% of
          jumps between {f1(disp.lower)} and {f1(disp.upper)} cm. The parabola flight time reads {f1(Math.abs(flight.bias))} cm
          lower than the wall (limits {f1(flight.lower)} to {f1(flight.upper)}), and frame counting {f1(Math.abs(frames.bias))} cm
          lower with wider limits ({f1(frames.lower)} to {f1(frames.upper)}). Flight-time methods are expected to read
          lower than a reach test, because the reach includes arm swing and heel raise.
        </p>
        <div className="overflow-hidden rounded-3xl">
          <SceneSlot
            n={3}
            alt="A chalk mark and a tape measure on a pale wall next to a laptop showing a scatter of points around a flat line"
            width={960}
            height={560}
          />
        </div>
      </section>

      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-bold">What it runs on</h2>
        <p className="leading-relaxed">
          MediaPipe Pose Landmarker (lite model, VIDEO mode) tracks 33 body points in the browser through WebAssembly.
          requestVideoFrameCallback gives each frame its true presentation time, so dropped frames do not bend the
          fit. The Screen Wake Lock API keeps the laptop awake through a lesson, and the class list lives in
          localStorage. There is no server, no account and no API key, and no video leaves the device.
        </p>
        <Fold summary="How this differs from existing jump apps">
          <p>
            <strong>My Jump 2</strong> is the most studied phone app. It needs slow-motion video and a person who picks
            the take-off and landing frames by hand. Saltara finds both automatically on a normal 30 fps webcam and
            estimates flight time below the frame interval.
          </p>
          <p>
            <strong>OpenJump</strong> on Android measures jumps from video with flight time only. Saltara opens in a
            browser and adds a second, independent height from displacement.
          </p>
          <p>
            <strong>Markerless research pipelines</strong> (OpenPose centre-of-mass methods, single smartphone studies)
            are research code, not a tool a teacher can open. Saltara takes its scale from gravity and ships with a class
            list.
          </p>
        </Fold>
        <Fold summary="Known limits">
          <p>Moving towards or away from the camera changes the scale mid-jump. Jump on a floor mark, in place.</p>
          <p>Landmark jitter at 30 fps can bend the curvature; that is why the fit is gated on R² and frame count.</p>
          <p>No published study has yet validated browser webcam flight time; our own pilot is the first check.</p>
        </Fold>
      </section>

      <p className="mt-14 leading-relaxed">
        Ready to try it?{" "}
        <Link href="/play" className="font-bold text-primary underline decoration-sun decoration-2 underline-offset-4">
          Open the jump lab
        </Link>{" "}
        or go{" "}
        <Link href="/" className="font-bold text-primary underline decoration-sun decoration-2 underline-offset-4">
          back to the story
        </Link>
        .
      </p>
    </article>
  );
}
