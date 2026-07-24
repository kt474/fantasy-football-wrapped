import { afterEach, describe, expect, test, vi } from "vitest";

import {
  analyzeDraftRoom,
  DRAFT_ROOM_TIMEOUT_MS,
} from "../src/api/draftRoomApi.ts";
import * as authFetchModule from "../src/lib/authFetch.ts";

const response = (status, payload) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => payload,
});

const manager = {
  userId: "manager-1",
  displayName: "Alpha",
  avatarImg: "avatar.png",
  seasons: 2,
  titles: 0,
  draftHistory: [
    {
      season: "2025",
      seasonType: "Redraft",
      positions: ["RB", "WR"],
    },
  ],
  auctionHistory: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("draft room backend client", () => {
  test("sends only the history needed by the premium analysis endpoint", async () => {
    const fetchMock = vi
      .spyOn(authFetchModule, "authenticatedFetch")
      .mockResolvedValue(
        response(200, {
          mode: "snake",
          pulse: [],
          managers: [],
          plan: null,
        })
      );

    const result = await analyzeDraftRoom({
      mode: "snake",
      managers: [manager],
      selectedManagerId: "manager-1",
      leagueSize: 12,
      draftSlot: 6,
    });

    expect(result.mode).toBe("snake");
    const [, options] = fetchMock.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      mode: "snake",
      selectedManagerId: "manager-1",
      leagueSize: 12,
      draftSlot: 6,
    });
    expect(body.managers).toEqual([
      {
        userId: "manager-1",
        displayName: "Alpha",
        draftHistory: manager.draftHistory,
        auctionHistory: [],
      },
    ]);
    expect(body.managers[0]).not.toHaveProperty("titles");
    expect(body.managers[0]).not.toHaveProperty("avatarImg");
  });

  test("surfaces backend entitlement failures", async () => {
    vi.spyOn(authFetchModule, "authenticatedFetch").mockResolvedValue(
      response(403, { message: "Premium subscription required" })
    );

    await expect(
      analyzeDraftRoom({
        mode: "auction",
        managers: [manager],
        selectedManagerId: "manager-1",
        budget: 200,
      })
    ).rejects.toThrow("Premium subscription required");
  });

  test("rejects a response for the wrong draft mode", async () => {
    vi.spyOn(authFetchModule, "authenticatedFetch").mockResolvedValue(
      response(200, {
        mode: "auction",
        budgetPlan: null,
        roomBenchmarks: [],
        priceBands: [],
      })
    );

    await expect(
      analyzeDraftRoom({
        mode: "snake",
        managers: [manager],
        selectedManagerId: "manager-1",
      })
    ).rejects.toThrow("invalid");
  });

  test("aborts a stalled analysis request", async () => {
    vi.useFakeTimers();
    vi.spyOn(authFetchModule, "authenticatedFetch").mockImplementation(
      (_input, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const request = analyzeDraftRoom({
      mode: "snake",
      managers: [manager],
      selectedManagerId: "manager-1",
    });
    const rejection = expect(request).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(DRAFT_ROOM_TIMEOUT_MS);
    await rejection;
  });
});
