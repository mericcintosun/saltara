import { describe, expect, it } from "vitest";
import { plotGeometry } from "@/components/trajectory-plot";
import { seedJumps } from "@/lib/data/seed";
import { traceFor } from "@/lib/data/trace";
import { analyzeJump } from "@/lib/jump-solver";

describe("plotGeometry", () => {
  const jump = seedJumps.find((j) => j.id === "j-02");
  if (!jump) throw new Error("seeded jump j-02 is missing");
  const samples = traceFor(jump);
  const analysis = analyzeJump(samples, { quiet: true });
  const g = plotGeometry(samples, analysis);

  it("lists one airborne index per flight frame of seeded j-02", () => {
    expect(analysis.takeoffIndex).toBeGreaterThanOrEqual(0);
    expect(g.airborne.length).toBe(analysis.landingIndex - analysis.takeoffIndex);
    expect(g.airborne[0]).toBe(analysis.takeoffIndex);
  });

  it("draws the fitted arc and keeps the apex", () => {
    expect(typeof g.arc).toBe("string");
    expect(g.arc.length).toBeGreaterThan(0);
    expect(g.apex).toBeDefined();
    expect(g.apex).not.toBeNull();
  });
});
