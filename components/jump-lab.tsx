"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Film, RotateCcw, Rewind, Save, Square } from "lucide-react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { ArcReveal, DROP_STAGGER_MS } from "@/components/arc-reveal";
import { ClassRoster } from "@/components/class-roster";
import { HeightFigure } from "@/components/height-figure";
import { SceneSlot } from "@/components/scene-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FILE_PLAYBACK_RATE, MAX_CLIP_MB, MAX_CLIP_SECONDS } from "@/lib/config";
import { SEED_VERSION } from "@/lib/data/seed";
import { traceFor } from "@/lib/data/trace";
import { loadEngine } from "@/lib/engine";
import { hintFor, isCoreError, type CoreErrorCode } from "@/lib/errors";
import { analyzeJump, createJumpWatcher, headlineCm, type JumpAnalysis, type PoseSample } from "@/lib/jump-solver";
import { toSample } from "@/lib/live-sample";
import { readPose, SKELETON_EDGES, LANDMARK, type FramePose } from "@/lib/pose-tracker";
import { JumpTraceSchema, VideoFileSchema } from "@/lib/schemas";
import { isDuplicateAttempt, MAX_ATTEMPTS, type ClassState } from "@/lib/store";
import type { LessonPayload, SourceInfo } from "@/lib/types";
import { useClassStore } from "@/lib/use-class-store";
import { cn } from "@/lib/utils";

type Mode = "camera" | "replay" | "file";
type Origin = "seed" | "camera" | "file";
type CamStatus = "idle" | "loading" | "live" | "error";
type FileStatus = "idle" | "loading" | "running" | "done";
type RVFC = (cb: (now: number, meta: { mediaTime: number }) => void) => number;
type WakeLockNav = { wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };

/**
 * A measured jump from this browser (camera or recorded clip). `key` is assigned once,
 * when the object is created, and is the idempotency key for saving it.
 */
type Measured = {
  key: string;
  samples: PoseSample[];
  analysis: JumpAnalysis;
  origin: "camera" | "file";
  fileName?: string;
};
/** A problem with the input itself (camera, engine or file), before any jump is analysed. */
type InputProblem = { code: CoreErrorCode | null; text: string };

const DEFAULT_REPLAY = "j-02";

/** A fresh key for one measurement. randomUUID needs a secure context, which the camera needs anyway. */
function newResultKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The seeded class list: every student of the lesson with their recorded attempts, tagged as seeded. */
function seedRoster(payload: LessonPayload): ClassState {
  return {
    version: 2,
    seedVersion: SEED_VERSION,
    activeId: payload.students[0]?.id ?? null,
    roster: payload.students.map((s) => ({
      id: s.id,
      name: s.name,
      attempts: payload.jumps
        .filter((j) => j.studentId === s.id)
        .flatMap((j) => {
          const cm = headlineCm(analyzeJump(traceFor(j), { quiet: true }));
          return cm === null ? [] : [{ key: `seed:${j.id}`, cm: Math.round(cm * 10) / 10, origin: "seed" as const }];
        }),
    })),
  };
}

/** Jump-quality codes are a warning to retry; input and engine codes are a hard stop. */
function toneFor(code: CoreErrorCode | null): "warn" | "bad" {
  switch (code) {
    case "too_few_frames":
    case "low_fit":
    case "feet_hidden":
    case "no_jump":
    case "drift":
      return "warn";
    default:
      // invalid_input, parse_failure, upstream_timeout, upstream_error, not_configured, camera problems
      return "bad";
  }
}

function problemTitle(code: CoreErrorCode | null): string {
  switch (code) {
    case null:
      return "Camera unavailable";
    case "upstream_timeout":
      return "Pose model timed out";
    case "upstream_error":
      return "Pose model unavailable";
    case "invalid_input":
      return "Clip not accepted";
    case "parse_failure":
      return "Clip could not be measured";
    case "not_configured":
      return "Not available here";
    default:
      return "Jump rejected";
  }
}

/** The camera, engine or clip failed: say why, retry the same input, or fall back to the seeded jumps. */
function InputErrorState({
  problem,
  onRetry,
  onUseSeeded,
}: {
  problem: InputProblem;
  onRetry: () => void;
  onUseSeeded: () => void;
}) {
  return (
    <div role="alert" className="space-y-3 rounded-2xl bg-background p-4 text-sm">
      <Badge variant={toneFor(problem.code)}>{problemTitle(problem.code)}</Badge>
      <p>{problem.text}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
        <Button variant="soft" size="sm" onClick={onUseSeeded}>
          <Rewind /> Use seeded jumps
        </Button>
      </div>
    </div>
  );
}

/** Before the first result: start the camera or replay the demo jump. */
function ResultEmptyState({
  text,
  replayId,
  showCamera,
  onStartCamera,
  onReplay,
}: {
  text: string;
  replayId: string;
  /** False while the camera is already starting or live. */
  showCamera: boolean;
  onStartCamera: () => void;
  onReplay: () => void;
}) {
  return (
    <Card className="space-y-4 p-6">
      <div className="mx-auto max-w-xs overflow-hidden rounded-3xl sm:max-w-sm">
        <SceneSlot
          n={5}
          alt="A dotted arc of hip positions rising and falling over a pale green field with one sun-yellow dot at the top"
          width={640}
          height={600}
        />
      </div>
      <p className="flex items-start gap-3 leading-relaxed text-muted-foreground">
        <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sun" />
        {text}
      </p>
      <div className="flex flex-wrap gap-2">
        {showCamera && (
          <Button onClick={onStartCamera}>
            <Camera /> Start camera
          </Button>
        )}
        {replayId && (
          <Button variant="soft" onClick={onReplay}>
            <Rewind /> Replay {replayId}
          </Button>
        )}
      </div>
    </Card>
  );
}

export function JumpLab({
  lesson: payload,
  source,
  resetRequested = false,
}: {
  lesson: LessonPayload;
  source: SourceInfo;
  resetRequested?: boolean;
}) {
  const { lesson, jumps } = payload;
  const router = useRouter();
  const defaultReplayId = jumps.find((j) => j.id === DEFAULT_REPLAY)?.id ?? jumps[0]?.id ?? "";
  const studentName = (id: string) => payload.students.find((s) => s.id === id)?.name ?? "Unknown";

  const seed = useMemo(() => seedRoster(payload), [payload]);
  const classStore = useClassStore(seed);
  const { state: classState } = classStore;
  const roster = classState.roster;
  const activeId = classState.activeId;

  const [mode, setMode] = useState<Mode>(source.initialInput === "camera" ? "camera" : "replay");
  const [replayId, setReplayId] = useState(defaultReplayId);
  const [notice, setNotice] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);

  const [cam, setCam] = useState<CamStatus>("idle");
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [problem, setProblem] = useState<InputProblem | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [live, setLive] = useState<Measured | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileCleanupRef = useRef<(() => void) | null>(null);
  const runningRef = useRef(false);
  const lastTsRef = useRef(0);
  const hintRef = useRef<string | null>(null);
  const frameTimes = useRef<number[]>([]);
  const frameCount = useRef(0);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  // /play?reset=demo: back to the seeded demo class, then drop the query so a reload keeps the list.
  const { reset: resetClass } = classStore;
  const resetHandled = useRef(false);
  useEffect(() => {
    if (!resetRequested || resetHandled.current) return;
    resetHandled.current = true;
    resetClass();
    setNotice("Demo class restored.");
    router.replace("/play");
  }, [resetRequested, resetClass, router]);

  const replay = useMemo(() => {
    const jump = jumps.find((j) => j.id === replayId) ?? jumps[0];
    if (!jump) return null;
    const samples = traceFor(jump);
    return { jump, samples, analysis: analyzeJump(samples) };
  }, [replayId, jumps]);

  const current: { key: string; samples: PoseSample[]; analysis: JumpAnalysis; origin: Origin; label: string } | null =
    mode === "replay"
      ? replay && {
          key: `seed:${replay.jump.id}`,
          samples: replay.samples,
          analysis: replay.analysis,
          origin: "seed" as const,
          label: `Sample data: seeded clip ${replay.jump.id} of ${lesson.className}, not a live measurement.`,
        }
      : live && {
          key: live.key,
          samples: live.samples,
          analysis: live.analysis,
          origin: live.origin,
          label:
            live.origin === "camera"
              ? "Live: measured from your camera in this browser."
              : `Recorded clip: measured from ${live.fileName ?? "your clip"} in this browser.`,
        };
  const activeStudent = roster.find((s) => s.id === activeId) ?? null;
  const resultKey = current?.key ?? null;
  // The result shown at page load sits still; every result that arrives later plays the reveal.
  const firstResultKey = useRef(resultKey);
  const revealArmed = useRef(false);
  if (resultKey !== firstResultKey.current) revealArmed.current = true;
  const animateReveal = resultKey !== null && revealArmed.current;
  const isSaved = resultKey !== null && isDuplicateAttempt(classState, resultKey);

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

  /** Stops whichever input runs (camera stream or recorded clip) and frees its resources. */
  const stopInput = useCallback(() => {
    runningRef.current = false;
    fileCleanupRef.current?.();
    fileCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      if (objectUrlRef.current) {
        video.removeAttribute("src");
        video.load();
      }
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
    setCam((c) => (c === "error" ? c : "idle"));
    setFileStatus((s) => (s === "done" ? s : "idle"));
    setFps(null);
    hintRef.current = null;
    setHint(null);
  }, []);

  useEffect(() => stopInput, [stopInput]);

  /** The rVFC frame loop shared by the camera and the recorded clip. */
  const runLoop = useCallback(
    (landmarker: PoseLandmarker, onSample: (s: PoseSample) => void) => {
      const video = videoRef.current;
      if (!video) return;
      frameTimes.current = [];
      frameCount.current = 0;
      const rvfc = (video as unknown as { requestVideoFrameCallback?: RVFC }).requestVideoFrameCallback;

      const onFrame = (now: number, meta?: { mediaTime: number }) => {
        if (!runningRef.current) return;
        const ts = Math.max(now, lastTsRef.current + 1);
        lastTsRef.current = ts;
        const pose = readPose(landmarker, video, meta?.mediaTime ?? video.currentTime, ts);
        if (pose) {
          onSample(toSample(pose, video.videoWidth));
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
    stopInput();
    setCam("loading");
    setProblem(null);
    setLive(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 }, facingMode: "user" },
        audio: false,
      });
    } catch (e) {
      setCam("error");
      setProblem({
        code: null,
        text:
          e instanceof Error && e.name === "NotAllowedError"
            ? "Camera permission was declined. Allow the camera in the address bar and try again, or load a recorded clip."
            : `The camera could not start (${e instanceof Error ? e.message : "unknown error"}). Load a recorded clip instead.`,
      });
      return;
    }
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stopInput();
      setCam("error");
      setProblem({ code: null, text: "The video element is missing. Reload the page and try again." });
      return;
    }
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // Autoplay of a muted stream is allowed; the frame loop still reads it if play() complains.
    }
    const engine = await loadEngine();
    if (streamRef.current !== stream) return; // stopped while the engine loaded
    if (isCoreError(engine)) {
      stopInput();
      setCam("error");
      setProblem({ code: engine.error, text: engine.hint });
      return;
    }
    if ("wakeLock" in navigator) {
      try {
        wakeRef.current = await (navigator as unknown as WakeLockNav).wakeLock.request("screen");
      } catch {
        // Wake Lock is a nice-to-have; the lesson still works without it.
      }
    }
    runningRef.current = true;
    setCam("live");
    const watcher = createJumpWatcher((samples, analysis) =>
      setLive({ key: newResultKey(), samples, analysis, origin: "camera" })
    );
    runLoop(engine, (s) => watcher.push(s));
  };

  const pickClip = () => fileInputRef.current?.click();

  const onClipPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = ""; // picking the same file again fires change again
    if (!file) return;
    stopInput();
    setMode("file");
    setProblem(null);
    setLive(null);
    setFileName(file.name);

    const checked = VideoFileSchema.safeParse({ name: file.name, type: file.type, size: file.size });
    if (!checked.success) {
      setProblem({ code: "invalid_input", text: hintFor("invalid_input") });
      return;
    }
    const video = videoRef.current;
    if (!video) {
      setProblem({ code: "not_configured", text: hintFor("not_configured") });
      return;
    }

    setFileStatus("loading");
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    video.srcObject = null;
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const readable = await new Promise<boolean>((resolve) => {
      const done = (ok: boolean) => () => {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("error", onError);
        resolve(ok);
      };
      const onMeta = done(true);
      const onError = done(false);
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("error", onError);
    });
    if (objectUrlRef.current !== url) return; // replaced or stopped meanwhile
    if (!readable || (Number.isFinite(video.duration) && video.duration > MAX_CLIP_SECONDS)) {
      stopInput();
      setFileStatus("idle");
      setProblem({ code: "invalid_input", text: hintFor("invalid_input") });
      return;
    }

    const engine = await loadEngine();
    if (objectUrlRef.current !== url) return;
    if (isCoreError(engine)) {
      stopInput();
      setFileStatus("idle");
      setProblem({ code: engine.error, text: engine.hint });
      return;
    }

    const samples: PoseSample[] = [];
    const onEnded = () => {
      runningRef.current = false;
      fileCleanupRef.current = null;
      setFileStatus("done");
      setFps(null);
      const trace = JumpTraceSchema.safeParse(samples);
      if (!trace.success) {
        setProblem({ code: "parse_failure", text: hintFor("parse_failure") });
        return;
      }
      setLive({
        key: newResultKey(),
        samples: trace.data,
        analysis: analyzeJump(trace.data),
        origin: "file",
        fileName: file.name,
      });
    };
    video.addEventListener("ended", onEnded, { once: true });
    fileCleanupRef.current = () => video.removeEventListener("ended", onEnded);

    video.currentTime = 0;
    video.playbackRate = FILE_PLAYBACK_RATE;
    runningRef.current = true;
    setFileStatus("running");
    runLoop(engine, (s) => {
      const last = samples[samples.length - 1];
      if (!last || s.t > last.t) samples.push(s);
    });
    try {
      await video.play();
    } catch {
      if (objectUrlRef.current !== url) return;
      stopInput();
      setFileStatus("idle");
      setProblem({ code: "invalid_input", text: hintFor("invalid_input") });
    }
  };

  /** Every save goes through the store; the outcome picks the sentence. */
  const saveAttempt = () => {
    const cm = current ? headlineCm(current.analysis) : null;
    if (cm === null || !current || !activeStudent || savePending) return;
    setSavePending(true);
    try {
      const outcome = classStore.save(activeStudent.id, { key: current.key, cm, origin: current.origin });
      switch (outcome) {
        case "duplicate":
          setNotice("This jump is already in the class list.");
          break;
        case "full":
          setNotice(`${activeStudent.name} already has ${MAX_ATTEMPTS} attempts. Pick the next student.`);
          break;
        case "no_student":
          setNotice("Pick a student in the class list first.");
          break;
        case "saved":
          setNotice(`Saved ${cm.toFixed(1)} cm as attempt ${activeStudent.attempts.length + 1} for ${activeStudent.name}.`);
          break;
      }
    } finally {
      setSavePending(false);
    }
  };

  /** Re-runs the start function of the input that failed. */
  const retryInput = () => {
    setProblem(null);
    if (mode === "file") pickClip();
    else void startCamera();
  };

  const switchToSeeded = () => {
    stopInput();
    setProblem(null);
    setMode("replay");
  };

  const a = current?.analysis ?? null;
  const est = a?.estimates ?? null;
  const running = (mode === "camera" && cam === "live") || (mode === "file" && fileStatus === "running");

  const stageMessage =
    mode === "camera"
      ? cam === "loading"
        ? "Starting the camera and downloading the pose model (a few MB, cached after the first time)."
        : cam === "error"
          ? "Camera stopped."
          : cam === "idle"
            ? "Camera is off."
            : null
      : fileStatus === "loading"
        ? "Loading the clip and the pose model."
        : fileStatus === "idle"
          ? `No clip loaded. Pick a video of one jump, up to ${MAX_CLIP_SECONDS} seconds and ${MAX_CLIP_MB} MB, with the whole body in view.`
          : null;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
      {!running && cam !== "loading" && (
        <div className="overflow-hidden rounded-3xl">
          <SceneSlot
            n={4}
            alt="A strip of empty classroom wall with a sun-yellow floor mark two metres in front of a laptop on a stool"
            width={960}
            height={360}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Input source">
        <Button
          variant={mode === "camera" ? "default" : "soft"}
          aria-pressed={mode === "camera"}
          onClick={() => {
            if (mode !== "camera") stopInput();
            setProblem(null);
            setMode("camera");
          }}
        >
          <Camera /> Live camera
        </Button>
        <Button
          variant={mode === "file" ? "default" : "soft"}
          aria-pressed={mode === "file"}
          onClick={() => {
            if (mode !== "file") {
              stopInput();
              setProblem(null);
              setFileStatus("idle");
            }
            setMode("file");
            pickClip();
          }}
        >
          <Film /> Recorded clip
        </Button>
        <Button
          variant={mode === "replay" ? "default" : "soft"}
          aria-pressed={mode === "replay"}
          onClick={() => {
            stopInput();
            setProblem(null);
            setMode("replay");
          }}
        >
          <Rewind /> Seeded jumps
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={onClipPicked}
        />
      </div>
      </div>

      {mode === "replay" ? (
        <Card>
          <CardHeader>
            <CardTitle>Seeded jumps from {lesson.className}</CardTitle>
            <CardDescription>
              Sample data: demo clips rebuilt frame by frame with webcam jitter. The same solver as the live camera runs
              on each one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {jumps.length === 0 && (
              <p className="flex w-full items-center gap-3 rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sun" />
                Recorded jumps from this lesson appear here once it has some; until then, measure one with the live camera.
              </p>
            )}
            {jumps.map((j) => (
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{mode === "camera" ? "Live camera" : "Recorded clip"}</CardTitle>
            <CardDescription>
              {mode === "camera"
                ? "Stand 2 to 3 metres from the laptop with your whole body in frame, wait one second, then jump straight up. Frames are processed on this device and never uploaded."
                : "Load a phone or laptop video of one jump: stand still for a second at the start, then jump straight up. The same pose model and solver run on it, in this browser, at half speed so no frame is skipped. The file never leaves this device."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary">
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn("absolute inset-0 h-full w-full object-contain", mode === "camera" && "-scale-x-100 object-cover")}
              />
              <canvas
                ref={canvasRef}
                className={cn("absolute inset-0 h-full w-full object-contain", mode === "camera" && "-scale-x-100 object-cover")}
              />
              {stageMessage && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  {stageMessage}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mode === "camera" ? (
                cam === "live" ? (
                  <Button variant="secondary" onClick={stopInput}>
                    <CameraOff /> Stop camera
                  </Button>
                ) : (
                  <Button onClick={startCamera} disabled={cam === "loading"}>
                    <Camera /> {cam === "loading" ? "Starting" : "Start camera"}
                  </Button>
                )
              ) : fileStatus === "running" ? (
                <Button variant="secondary" onClick={stopInput}>
                  <Square /> Stop clip
                </Button>
              ) : (
                <Button onClick={pickClip} disabled={fileStatus === "loading"}>
                  <Film /> {fileStatus === "loading" ? "Loading" : fileName ? "Choose another clip" : "Choose a clip"}
                </Button>
              )}
              {running && fps !== null && (
                <Badge variant="sun">
                  {mode === "camera" ? "camera at" : "tracking at"} {fps} fps
                </Badge>
              )}
              {running && hint && <Badge variant="warn">{hint}</Badge>}
              {mode === "file" && fileName && fileStatus !== "idle" && (
                <span className="min-w-0 max-w-full truncate text-sm text-muted-foreground" title={fileName}>
                  {fileName}
                </span>
              )}
            </div>
            {problem && <InputErrorState problem={problem} onRetry={retryInput} onUseSeeded={switchToSeeded} />}
          </CardContent>
        </Card>
      )}

      <section aria-live="polite" className="space-y-4">
        {!current || !a ? (
          <ResultEmptyState
            text={
              mode === "file"
                ? "The arc and the height appear here when the loaded clip finishes playing."
                : "The arc and the height appear here about a second after the camera sees you stand still, jump and land."
            }
            replayId={defaultReplayId}
            showCamera={!(mode === "camera" && (cam === "live" || cam === "loading"))}
            onStartCamera={() => {
              setMode("camera");
              void startCamera();
            }}
            onReplay={() => {
              stopInput();
              setProblem(null);
              setReplayId(defaultReplayId);
              setMode("replay");
            }}
          />
        ) : (
          <>
            <ArcReveal
              samples={current.samples}
              analysis={a}
              revealKey={current.key}
              animateOnMount={animateReveal}
            />
            {a.ok && est ? (
              <Card className="saltara-wipe">
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <HeightFigure
                      cm={est.flightTimeCm}
                      revealKey={current.key}
                      animateOnMount={animateReveal}
                      delayMs={a.airborneFrames * DROP_STAGGER_MS + 600}
                    />
                    <p className="mt-1 break-words text-sm font-bold" data-origin={current.origin} title={current.label}>
                      {current.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      scale from gravity: {Math.round(a.pxPerMetre ?? 0)} px/m, fit R² {a.fit?.r2.toFixed(3)},{" "}
                      {a.airborneFrames} airborne frames at {Math.round(a.fps)} fps
                    </p>
                  </div>
                  {a.flags.drift && (
                    <div className="space-y-2 rounded-2xl bg-background p-4 text-sm">
                      <Badge variant="warn">Moved during the jump</Badge>
                      <p className="text-warn">{hintFor("drift")}</p>
                    </div>
                  )}
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
                    <Button
                      variant="sun"
                      onClick={saveAttempt}
                      disabled={!activeStudent || savePending || isSaved}
                      aria-busy={savePending}
                    >
                      <Save /> {isSaved ? "Saved" : `Save to ${activeStudent ? activeStudent.name : "a student"}`}
                    </Button>
                    {notice && <span className="text-sm">{notice}</span>}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="space-y-2 p-6">
                <Badge variant={toneFor(a.code)}>{problemTitle(a.code)}</Badge>
                <p className={toneFor(a.code) === "bad" ? "text-bad" : "text-warn"}>{a.reason}</p>
                <p className="break-words text-sm text-muted-foreground" title={current.label}>
                  {current.label}
                </p>
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
          classStore.select(id);
          setNotice(null);
        }}
        onAddStudent={(name) => classStore.addStudent(name)}
        onReset={() => {
          classStore.reset();
          setNotice(null);
        }}
      />
    </div>
  );
}
