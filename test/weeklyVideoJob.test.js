import { afterEach, describe, expect, test, vi } from "vitest";
import { HttpError } from "../src/lib/http.ts";
import {
  getUsableWeeklyRecapVideoUrl,
  getWeeklyRecapVideoStartErrorMessage,
  getWeeklyRecapVideoTerminalMessage,
  WeeklyRecapVideoJobController,
} from "../src/components/weekly_report/weeklyVideoJob.ts";

const makeJob = (status, overrides = {}) => ({
  jobId: "job-123",
  status,
  progress: status === "complete" ? 1 : 0.25,
  createdAt: "2026-07-18T12:00:00.000Z",
  expiresAt: null,
  videoUrl: status === "complete" ? "https://video.example/recap.mp4" : null,
  ...overrides,
});

const makeController = (overrides = {}) => {
  const onJob = vi.fn();
  const onPollFailure = vi.fn();
  const onRestoreFailure = vi.fn();
  const controller = new WeeklyRecapVideoJobController({
    getJob: vi.fn(),
    getLatestJob: vi.fn().mockResolvedValue(null),
    onJob,
    onPollFailure,
    onRestoreFailure,
    pollIntervalMs: 100,
    ...overrides,
  });
  return { controller, onJob, onPollFailure, onRestoreFailure };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("weekly recap video job lifecycle", () => {
  test("continues polling starting, queued, and rendering jobs", async () => {
    vi.useFakeTimers();
    const getJob = vi
      .fn()
      .mockResolvedValueOnce(makeJob("queued"))
      .mockResolvedValueOnce(makeJob("rendering", { progress: 0.7 }))
      .mockResolvedValueOnce(makeJob("complete"));
    const { controller, onJob } = makeController({ getJob });

    controller.adopt(makeJob("starting"));
    await vi.runAllTimersAsync();

    expect(onJob.mock.calls.map(([value]) => value.status)).toEqual([
      "starting",
      "queued",
      "rendering",
      "complete",
    ]);
    expect(getJob).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("handles an immediately complete POST response without polling", () => {
    vi.useFakeTimers();
    const getJob = vi.fn();
    const { controller, onJob } = makeController({ getJob });

    controller.adopt(makeJob("complete"), 1_500);

    expect(onJob).toHaveBeenCalledWith(makeJob("complete"));
    expect(getJob).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  test.each([
    ["failed", "could not be completed"],
    ["cancelled", "was cancelled"],
    ["expired", "has expired"],
  ])("stops on %s and returns a safe message", (status, message) => {
    vi.useFakeTimers();
    const getJob = vi.fn();
    const value = makeJob(status);
    const { controller } = makeController({ getJob });

    controller.adopt(value);

    expect(getJob).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(getWeeklyRecapVideoTerminalMessage(value)).toContain(message);
  });

  test("never exposes an expired completed URL", () => {
    const expired = makeJob("complete", {
      expiresAt: "2026-07-18T12:01:00.000Z",
    });

    expect(
      getUsableWeeklyRecapVideoUrl(expired, Date.parse("2026-07-18T12:02:00.000Z"))
    ).toBeNull();
    expect(
      getWeeklyRecapVideoTerminalMessage(
        expired,
        Date.parse("2026-07-18T12:02:00.000Z")
      )
    ).toContain("no longer available");
  });

  test("removes a completed URL when its expiry time is reached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T12:00:00.000Z"));
    const completed = makeJob("complete", {
      expiresAt: "2026-07-18T12:01:00.000Z",
    });
    const { controller, onJob } = makeController();

    controller.adopt(completed);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(onJob).toHaveBeenLastCalledWith({
      ...completed,
      status: "expired",
      videoUrl: null,
    });
  });

  test("restores a latest completed job and resumes an active one", async () => {
    vi.useFakeTimers();
    const completed = makeJob("complete");
    const active = makeJob("rendering");
    const getLatestJob = vi
      .fn()
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce(active);
    const getJob = vi.fn().mockResolvedValue(makeJob("complete"));
    const { controller, onJob } = makeController({ getLatestJob, getJob });
    const context = { leagueId: "league-1", season: "2025", week: 7 };

    await controller.restore(context);
    expect(onJob).toHaveBeenLastCalledWith(completed);
    expect(vi.getTimerCount()).toBe(0);

    await controller.restore(context);
    expect(onJob).toHaveBeenLastCalledWith(active);
    await vi.runAllTimersAsync();
    expect(onJob).toHaveBeenLastCalledWith(makeJob("complete"));
  });

  test("does nothing when latest-job restoration returns 404/null", async () => {
    const getLatestJob = vi.fn().mockResolvedValue(null);
    const { controller, onJob, onRestoreFailure } = makeController({
      getLatestJob,
    });

    await controller.restore({ leagueId: "league-1", season: "2025", week: 7 });

    expect(onJob).not.toHaveBeenCalled();
    expect(onRestoreFailure).not.toHaveBeenCalled();
  });

  test("ignores a stale polling response after cancellation", async () => {
    vi.useFakeTimers();
    let resolvePoll;
    const getJob = vi.fn(
      () => new Promise((resolve) => {
        resolvePoll = resolve;
      })
    );
    const { controller, onJob } = makeController({ getJob });

    controller.adopt(makeJob("rendering"));
    await vi.advanceTimersByTimeAsync(0);
    controller.cancel();
    resolvePoll(makeJob("complete"));
    await Promise.resolve();

    expect(onJob.mock.calls.map(([value]) => value.status)).toEqual(["rendering"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("maps a 409 to the active-render message without exposing server errors", () => {
    expect(
      getWeeklyRecapVideoStartErrorMessage(
        new HttpError("Weekly recap video request", 409)
      )
    ).toBe(
      "Another video render is already active. Please try again when it finishes."
    );
    expect(getWeeklyRecapVideoStartErrorMessage(new Error("renderer secret"))).toBe(
      "Unable to start the video render. Please try again."
    );
  });
});
