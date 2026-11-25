"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, Film, Save } from "lucide-react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { ClassRoster, MAX_ATTEMPTS, type RosterStudent } from "@/components/class-roster";
import { TrajectoryPlot } from "@/components/trajectory-plot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lesson, seedJumps, studentName, students, traceFor } from "@/lib/data";
import { analyzeJump, createJumpWatcher, headlineCm, type JumpAnalysis, type PoseSample } from "@/lib/jump-solver";
import { loadPoseLandmarker, readPose, SKELETON_EDGES, LANDMARK, type FramePose } from "@/lib/pose-tracker";
import { cn } from "@/lib/utils";

type Mode = "camera" | "replay";
type CamStatus = "idle" | "loading" | "live" | "error";
type RVFC = (cb: (now: number, meta: { mediaTime: number }) => void) => number;
type WakeLockNav = { wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };

const STORAGE_KEY = "saltara.class.v1";

function seedRoster(): RosterStudent[] {
  return students.map((s) => ({
    id: s.id,
    name: s.name,
    attempts: seedJumps
      .filter((j) => j.studentId === s.id)
      .map((j) => headlineCm(analyzeJump(traceFor(j))))
      .filter((v): v is number => v !== null)
      .map((v) => Math.round(v * 10) / 10),
  }));
}

export function JumpLab() {
  const [mode, setMode] = useState<Mode>("replay");
  const [replayId, setReplayId] = useState("j-02");
  const [roster, setRoster] = useState<RosterStudent[]>(seedRoster);
  const [activeId, setActiveId] = useState<string | null>("s-elif");
  const [storageReady, setStorageReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [cam, setCam] = useState<CamStatus>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [live, setLive] = useState<{ samples: PoseSample[]; analysis: JumpAnalysis } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const lastTsRef = useRef(0);
  const hintRef = useRef<string | null>(null);
  const frameTimes = useRef<number[]>([]);
  const frameCount = useRef(0);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Class list persistence (localStorage, this laptop only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { roster: RosterStudent[]; activeId: string | null };
        if (Array.isArray(parsed.roster)) {
          setRoster(parsed.roster);
          setActiveId(parsed.activeId);
        }
      }
    } catch {
      // A corrupt entry falls back to the demo class.
    }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (storageReady) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ roster, activeId }));
  }, [roster, activeId, storageReady]);

  const replay = useMemo(() => {
    const jump = seedJumps.find((j) => j.id === replayId) ?? seedJumps[0];
    const samples = traceFor(jump);
    return { jump, samples, analysis: analyzeJump(samples) };
  }, [replayId]);

  const current = mode === "replay" ? replay : live;
  const activeStudent = roster.find((s) => s.id === activeId) ?? null;

  const drawPose = useCallback((pose: FramePose) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const plum = css.getPropertyValue("--plum").trim();
    const sun = css.getPropertyValue("--sun").trim();
    const W = canvas.width;
    const H = canvas.height;
    const lm = pose.landmarks;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = plum;
    for (const [i, j] of SKELETON_EDGES) {
      ctx.beginPath();
      ctx.moveTo(lm[i].x * W, lm[i].y * H);
      ctx.lineTo(lm[j].x * W, lm[j].y * H);
      ctx.stroke();
    }
    const hipX = ((lm[LANDMARK.leftHip].x + lm[LANDMARK.rightHip].x) / 2) * W;
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(hipX, pose.sample.hipY, 12, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
    setCam((c) => (c === "error" ? c : "idle"));
    setFps(null);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const runLoop = useCallback(
    (landmarker: PoseLandmarker) => {
      const video = videoRef.current;
      if (!video) return;
      const watcher = createJumpWatcher((samples, analysis) => setLive({ samples, analysis }));
      const rvfc = (video as unknown as { requestVideoFrameCallback?: RVFC }).requestVideoFrameCallback;

      const onFrame = (now: number, meta?: { mediaTime: number }) => {
        if (!runningRef.current) return;
        const ts = Math.max(now, lastTsRef.current + 1);
        lastTsRef.current = ts;
        const pose = readPose(landmarker, video, meta?.mediaTime ?? video.currentTime, ts);
        if (pose) {
          watcher.push(pose.sample);
          drawPose(pose);
        }
        const nextHint = !pose
          ? "No one in frame yet."
          : pose.feetVisible
            ? null
            : "Step back until your feet are in the picture.";
        if (nextHint !== hintRef.current) {
          hintRef.current = nextHint;
          setHint(nextHint);
        }
        const times = frameTimes.current;
        times.push(now);
        if (times.length > 30) times.shift();
        frameCount.current += 1;
        if (times.length === 30 && frameCount.current % 15 === 0) {
          setFps(Math.round((29 * 1000) / (times[29] - times[0])));
        }
        schedule();
      };
      const schedule = () => {
        if (rvfc) rvfc.call(video, onFrame);
        else requestAnimationFrame((now) => onFrame(now));
      };
      schedule();
    },
    [drawPose]
  );

  const startCamera = async () => {
    setCam("loading");
    setCamError(null);
    setLive(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element missing.");
      video.srcObject = stream;
      await video.play();
      const landmarker = await loadPoseLandmarker();
      if ("wakeLock" in navigator) {
        try {
          wakeRef.current = await (navigator as unknown as WakeLockNav).wakeLock.request("screen");
        } catch {
          // Wake Lock is a nice-to-have; the lesson still works without it.
        }
      }
      runningRef.current = true;
      setCam("live");
      runLoop(landmarker);
    } catch (e) {
      stopCamera();
      setCam("error");
      setCamError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Camera permission was declined. Allow the camera in the address bar and try again."
          : `The camera or the pose model could not start (${e instanceof Error ? e.message : "unknown error"}).`
      );
    }
  };

  const saveAttempt = () => {
    const cm = current ? headlineCm(current.analysis) : null;
    if (cm === null || !activeStudent) return;
    if (activeStudent.attempts.length >= MAX_ATTEMPTS) {
      setNotice(`${activeStudent.name} already has ${MAX_ATTEMPTS} attempts. Pick the next student.`);
      return;
    }
    setRoster((r) => r.map((s) => (s.id === activeStudent.id ? { ...s, attempts: [...s.attempts, Math.round(cm * 10) / 10] } : s)));
    setNotice(`Saved ${cm.toFixed(1)} cm as attempt ${activeStudent.attempts.length + 1} for ${activeStudent.name}.`);
  };

  const a = current?.analysis ?? null;
  const est = a?.estimates ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Input">
        <Button variant={mode === "camera" ? "default" : "soft"} aria-pressed={mode === "camera"} onClick={() => setMode("camera")}>
          <Camera /> Live camera
        </Button>
        <Button
          variant={mode === "replay" ? "default" : "soft"}
          aria-pressed={mode === "replay"}
          onClick={() => {
            stopCamera();
            setMode("replay");
          }}
        >
          <Film /> Recorded jumps
        </Button>
      </div>

      {mode === "camera" ? (
        <Card>
          <CardHeader>
            <CardTitle>Live camera</CardTitle>
            <CardDescription>
              Stand 2 to 3 metres from the laptop with your whole body in frame, wait one second, then jump straight
              up. Frames are processed on this device and never uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary">
              <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
              {cam !== "live" && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  {cam === "loading"
                    ? "Starting the camera and downloading the pose model (a few MB, cached after the first time)."
                    : cam === "error"
                      ? "Camera stopped."
                      : "Camera is off."}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {cam === "live" ? (
                <Button variant="secondary" onClick={stopCamera}>
                  <CameraOff /> Stop camera
                </Button>
              ) : (
                <Button onClick={startCamera} disabled={cam === "loading"}>
                  <Camera /> {cam === "loading" ? "Starting" : "Start camera"}
                </Button>
              )}
              {cam === "live" && fps !== null && <Badge variant="sun">camera at {fps} fps</Badge>}
              {cam === "live" && hint && <Badge variant="warn">{hint}</Badge>}
            </div>
            {camError && (
              <div className="space-y-3 rounded-2xl bg-background p-4 text-sm">
                <Badge variant="bad">Camera unavailable</Badge>
                <p>{camError}</p>
                <Button variant="soft" size="sm" onClick={() => setMode("replay")}>
                  Use a recorded jump instead
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recorded jumps from {lesson.className}</CardTitle>
            <CardDescription>
              Demo clips rebuilt frame by frame with webcam jitter. The same solver as the live camera runs on each one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {seedJumps.map((j) => (
              <Button
                key={j.id}
                size="sm"
                variant={j.id === replayId ? "default" : "soft"}
                className={cn(j.id !== replayId && "bg-background")}
                aria-pressed={j.id === replayId}
                onClick={() => setReplayId(j.id)}
              >
                {studentName(j.studentId)}, try {j.attempt}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <section aria-live="polite" className="space-y-4">
        {!current || !a ? (
          <Card className="p-6 text-muted-foreground">
            No jump yet. Once the camera sees you stand still and land a jump, the arc and the height appear here about
            a second after landing.
          </Card>
        ) : (
          <>
            <TrajectoryPlot samples={current.samples} analysis={a} layer={3} />
            {a.ok && est ? (
              <Card className="saltara-wipe">
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <p className="font-display text-6xl font-extrabold">{est.flightTimeCm.toFixed(0)} cm</p>
                    <p className="text-sm text-muted-foreground">
                      scale from gravity: {Math.round(a.pxPerMetre ?? 0)} px/m, fit R² {a.fit?.r2.toFixed(3)},{" "}
                      {a.airborneFrames} airborne frames at {Math.round(a.fps)} fps
                    </p>
                  </div>
                  <dl className="divide-y divide-border rounded-2xl bg-background">
                    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                      <dt>Frame counting</dt>
                      <dd className="font-bold tabular-nums">{est.frameCountCm.toFixed(1)} cm</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                      <dt>Parabola flight time (reported)</dt>
                      <dd className="font-bold tabular-nums">{est.flightTimeCm.toFixed(1)} cm</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                      <dt>Standing hip to apex</dt>
                      <dd className="font-bold tabular-nums">{est.displacementCm.toFixed(1)} cm</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="sun" onClick={saveAttempt} disabled={!activeStudent}>
                      <Save /> Save to {activeStudent ? activeStudent.name : "a student"}
                    </Button>
                    {notice && <span className="text-sm">{notice}</span>}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="space-y-2 p-6">
                <Badge variant="warn">Jump rejected</Badge>
                <p>{a.reason}</p>
              </Card>
            )}
          </>
        )}
      </section>

      <ClassRoster
        lessonName={lesson.className}
        roster={roster}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setNotice(null);
        }}
        onAddStudent={(name) => {
          const id = `s-${Date.now().toString(36)}`;
          setRoster((r) => [...r, { id, name, attempts: [] }]);
          setActiveId(id);
        }}
        onReset={() => {
          setRoster(seedRoster());
          setActiveId("s-elif");
          setNotice(null);
        }}
      />
    </div>
  );
}
