import type {
  WeeklyRecapVideoJob,
  WeeklyRecapVideoJobStatus,
  WeeklyRecapVideoProps,
} from "@/types/types";
import { HttpError } from "@/lib/http";

const canonicalizeJson = (value: unknown): string => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Video input contains a non-finite number");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(object[key])}`);
    return `{${entries.join(",")}}`;
  }

  throw new Error("Video input is not valid JSON");
};

export const hashWeeklyRecapVideoInput = async (
  inputProps: WeeklyRecapVideoProps
) => {
  const bytes = new TextEncoder().encode(canonicalizeJson(inputProps));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const ACTIVE_WEEKLY_RECAP_VIDEO_STATUSES = new Set<WeeklyRecapVideoJobStatus>([
  "starting",
  "queued",
  "rendering",
]);

export const isActiveWeeklyRecapVideoJob = (job: WeeklyRecapVideoJob) =>
  ACTIVE_WEEKLY_RECAP_VIDEO_STATUSES.has(job.status);

export const getUsableWeeklyRecapVideoUrl = (
  job: WeeklyRecapVideoJob,
  now = Date.now()
) => {
  if (job.status !== "complete" || !job.videoUrl) {
    return null;
  }

  if (job.expiresAt) {
    const expiresAt = Date.parse(job.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      return null;
    }
  }

  return job.videoUrl;
};

export const getWeeklyRecapVideoTerminalMessage = (
  job: WeeklyRecapVideoJob,
  now = Date.now()
) => {
  if (job.status === "failed") {
    return "Weekly recap video could not be completed. Please try again.";
  }
  if (job.status === "cancelled") {
    return "Weekly recap video was cancelled. You can start a new render.";
  }
  if (job.status === "expired") {
    return "This weekly recap video has expired. Start a new render to create another.";
  }
  if (job.status === "complete" && !getUsableWeeklyRecapVideoUrl(job, now)) {
    return "This weekly recap video is no longer available. Start a new render to create another.";
  }
  return null;
};

export const getWeeklyRecapVideoStartErrorMessage = (error: unknown) => {
  if (error instanceof HttpError && error.status === 409) {
    return "Another video render is already active. Please try again when it finishes.";
  }
  if (error instanceof HttpError && error.status === 429) {
    return "You’ve reached your video render limit. Please try again later.";
  }
  return "Unable to start the video render. Please try again.";
};

type VideoJobContext = {
  leagueId: string;
  season: string;
  week: number;
  inputHash: string;
};

type Timer = ReturnType<typeof setTimeout>;

type WeeklyRecapVideoJobControllerOptions = {
  getJob: (jobId: string) => Promise<WeeklyRecapVideoJob>;
  getLatestJob: (context: VideoJobContext) => Promise<WeeklyRecapVideoJob | null>;
  onJob: (job: WeeklyRecapVideoJob) => void;
  onPollFailure: (error: unknown) => void;
  onRestoreFailure: (error: unknown) => void;
  pollIntervalMs?: number;
  maxPollFailures?: number;
  schedule?: (callback: () => void, delay: number) => Timer;
  cancelScheduled?: (timer: Timer) => void;
};

export class WeeklyRecapVideoJobController {
  private readonly options: Required<
    Pick<
      WeeklyRecapVideoJobControllerOptions,
      "pollIntervalMs" | "maxPollFailures" | "schedule" | "cancelScheduled"
    >
  > &
    Omit<
      WeeklyRecapVideoJobControllerOptions,
      "pollIntervalMs" | "maxPollFailures" | "schedule" | "cancelScheduled"
    >;
  private generation = 0;
  private timer: Timer | null = null;
  private pollFailures = 0;
  private activeJobId = "";

  constructor(options: WeeklyRecapVideoJobControllerOptions) {
    this.options = {
      pollIntervalMs: 2_000,
      maxPollFailures: 3,
      schedule: (callback, delay) => setTimeout(callback, delay),
      cancelScheduled: (timer) => clearTimeout(timer),
      ...options,
    };
  }

  cancel() {
    this.generation += 1;
    this.clearTimer();
    this.pollFailures = 0;
    this.activeJobId = "";
  }

  adopt(job: WeeklyRecapVideoJob, initialPollDelayMs = 0) {
    this.cancel();
    const generation = this.generation;
    this.accept(job, generation, initialPollDelayMs);
  }

  async restore(context: VideoJobContext) {
    this.cancel();
    const generation = this.generation;

    try {
      const job = await this.options.getLatestJob(context);
      if (generation !== this.generation || !job) {
        return;
      }
      this.accept(job, generation, this.options.pollIntervalMs);
    } catch (error) {
      if (generation === this.generation) {
        this.options.onRestoreFailure(error);
      }
    }
  }

  private clearTimer() {
    if (this.timer !== null) {
      this.options.cancelScheduled(this.timer);
      this.timer = null;
    }
  }

  private accept(
    job: WeeklyRecapVideoJob,
    generation: number,
    nextPollDelayMs: number
  ) {
    if (generation !== this.generation) {
      return;
    }

    this.clearTimer();
    this.options.onJob(job);
    if (!isActiveWeeklyRecapVideoJob(job)) {
      this.activeJobId = "";
      const expiresAt = job.expiresAt ? Date.parse(job.expiresAt) : NaN;
      const expiresInMs = expiresAt - Date.now();
      if (
        job.status === "complete" &&
        getUsableWeeklyRecapVideoUrl(job) &&
        Number.isFinite(expiresInMs) &&
        expiresInMs > 0
      ) {
        this.timer = this.options.schedule(() => {
          this.timer = null;
          if (generation === this.generation) {
            this.options.onJob({
              ...job,
              status: "expired",
              videoUrl: null,
            });
          }
        }, expiresInMs);
      }
      return;
    }

    this.activeJobId = job.jobId;
    this.timer = this.options.schedule(
      () => void this.poll(job.jobId, generation),
      nextPollDelayMs
    );
  }

  private async poll(jobId: string, generation: number) {
    this.timer = null;
    if (generation !== this.generation || this.activeJobId !== jobId) {
      return;
    }

    try {
      const job = await this.options.getJob(jobId);
      if (generation !== this.generation || this.activeJobId !== jobId) {
        return;
      }
      this.pollFailures = 0;
      this.accept(job, generation, this.options.pollIntervalMs);
    } catch (error) {
      if (generation !== this.generation || this.activeJobId !== jobId) {
        return;
      }

      this.pollFailures += 1;
      if (this.pollFailures <= this.options.maxPollFailures) {
        this.timer = this.options.schedule(
          () => void this.poll(jobId, generation),
          this.options.pollIntervalMs * this.pollFailures
        );
        return;
      }

      this.activeJobId = "";
      this.options.onPollFailure(error);
    }
  }
}
