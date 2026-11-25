import { describe, expect, it } from "vitest";
import { seedJumps } from "@/lib/data/seed";
import { traceFor } from "@/lib/data/trace";
import { analyzeJump, G, type PoseSample } from "@/lib/jump-solver";
import { JumpTraceSchema, VideoFileSchema } from "@/lib/schemas";

interface SynthOptions {
  fps?: number;
  pxPerMetre?: number;
  riseM?: number;
  standingHipY?: number;
  takeoffAt?: number;
  afterLanding?: number;
  clipStart?: number;
}

/**
 * A noiseless jump: stand still, fly a true gravity parabola, stand still again.
 * The ankle rises exactly as much as the hip (rigid body in flight).
 */
function synthJump(o: SynthOptions = {}): PoseSample[] {
  const fps = o.fps ?? 30;
  const pxm = o.pxPerMetre ?? 400;
  const riseM = o.riseM ?? 0.3;
  const hip0 = o.standingHipY ?? 300;
  const ankle0 = hip0 + 0.86 * pxm;
  const takeoffAt = o.takeoffAt ?? 1.01;
  const afterLanding = o.afterLanding ?? 1;
  const clipStart = o.clipStart ?? 5;
  const flightT = Math.sqrt((8 * riseM) / G);
  const v0 = (G * flightT) / 2;
  const end = takeoffAt + flightT + afterLanding;

  const out: PoseSample[] = [];
  for (let k = 0; k / fps < end; k++) {
    const t = k / fps;
    let lift = 0;
    if (t >= takeoffAt && t < takeoffAt + flightT) {
      const s = t - takeoffAt;
      lift = pxm * (v0 * s - 0.5 * G * s * s);
    }
    out.push({ t: clipStart + t, hipY: hip0 - lift, ankleY: ankle0 - lift });
  }
  return out;
}

describe("analyzeJump", () => {
  it("recovers scale and height from a noiseless 30 fps parabola", () => {
    const r = analyzeJump(synthJump({ fps: 30, pxPerMetre: 400, riseM: 0.3 }));
    expect(r.ok).toBe(true);
    expect(r.code).toBeNull();
    expect(r.pxPerMetre).not.toBeNull();
    expect(Math.abs((r.pxPerMetre ?? 0) - 400) / 400).toBeLessThan(0.01);
    expect(r.estimates).not.toBeNull();
    expect(Math.abs((r.estimates?.displacementCm ?? 0) - 30)).toBeLessThan(0.5);
  });

  it("measures seeded jump j-02 within 3 cm of its true rise", () => {
    const j = seedJumps.find((x) => x.id === "j-02");
    expect(j).toBeDefined();
    if (!j) return;
    const r = analyzeJump(traceFor(j));
    expect(r.ok).toBe(true);
    const headline = r.estimates?.flightTimeCm ?? Number.NaN;
    expect(Math.abs(headline - j.riseM * 100)).toBeLessThan(3);
  });

  it("rejects a clip with only 4 airborne frames as too_few_frames", () => {
    const fps = 30;
    const hip0 = 300;
    const ankle0 = hip0 + 344;
    const samples: PoseSample[] = [];
    for (let k = 0; k < 54; k++) {
      const airborne = k >= 30 && k < 34;
      const lift = airborne ? 40 : 0;
      samples.push({ t: 5 + k / fps, hipY: hip0 - lift, ankleY: ankle0 - lift });
    }
    const r = analyzeJump(samples);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("too_few_frames");
    expect(r.airborneFrames).toBe(4);
  });

  it("rejects heavy hip jitter in flight as low_fit", () => {
    const clean = synthJump({ fps: 30, pxPerMetre: 400, riseM: 0.3 });
    const ankle0 = clean[0].ankleY;
    let flip = 1;
    const noisy = clean.map((s) => {
      if (s.ankleY >= ankle0) return s; // jitter only while airborne, so take-off and landing stay clean
      flip = -flip;
      return { ...s, hipY: s.hipY + flip * 40 };
    });
    const r = analyzeJump(noisy);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("low_fit");
  });

  it("keeps the result but sets the drift flag when shoulder width grows 10 percent", () => {
    const clean = synthJump({ fps: 30, pxPerMetre: 400, riseM: 0.3 });
    const last = clean.length - 1;
    const drifting = clean.map((s, k) => ({ ...s, shoulderW: 100 * (1 + (0.1 * k) / last) }));
    const r = analyzeJump(drifting);
    expect(r.ok).toBe(true);
    expect(r.flags.drift).toBe(true);
  });

  it("does not set the drift flag when shoulder width is steady", () => {
    const steady = synthJump().map((s) => ({ ...s, shoulderW: 100 }));
    const r = analyzeJump(steady);
    expect(r.ok).toBe(true);
    expect(r.flags.drift).toBe(false);
  });
});

describe("schemas", () => {
  it("JumpTraceSchema rejects non-increasing timestamps", () => {
    const samples = synthJump().slice(0, 20);
    const repeated = samples.map((s, k) => (k === 10 ? { ...s, t: samples[9].t } : s));
    expect(JumpTraceSchema.safeParse(samples).success).toBe(true);
    expect(JumpTraceSchema.safeParse(repeated).success).toBe(false);
  });

  it("VideoFileSchema accepts a small video and rejects other files", () => {
    expect(VideoFileSchema.safeParse({ name: "jump.mp4", type: "video/mp4", size: 5_000_000 }).success).toBe(true);
    expect(VideoFileSchema.safeParse({ name: "notes.pdf", type: "application/pdf", size: 1000 }).success).toBe(false);
    expect(VideoFileSchema.safeParse({ name: "huge.mov", type: "video/quicktime", size: 500 * 1024 * 1024 }).success).toBe(
      false
    );
  });
});
