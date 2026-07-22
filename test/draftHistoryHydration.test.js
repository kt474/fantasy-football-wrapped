import { describe, expect, test, vi } from "vitest";

import { createHistoricalDraftHydrator } from "../src/lib/draftHistoryHydration.ts";

const buildLeague = (overrides = {}) => ({
  platform: "sleeper",
  leagueId: "league-1",
  draftId: "draft-1",
  season: "2025",
  seasonType: "Redraft",
  scoringType: 1,
  ...overrides,
});

describe("historical draft hydration", () => {
  test("does not request draft data when picks are already present", async () => {
    const loadMetadata = vi.fn();
    const loadPicks = vi.fn();
    const hydrate = createHistoricalDraftHydrator({
      loadMetadata,
      loadPicks,
    });

    await hydrate(buildLeague({ draftPicks: [{ position: "RB" }] }));

    expect(loadMetadata).not.toHaveBeenCalled();
    expect(loadPicks).not.toHaveBeenCalled();
  });

  test("deduplicates concurrent requests and records an empty draft attempt", async () => {
    let resolvePicks;
    const loadMetadata = vi.fn().mockResolvedValue({ type: "snake" });
    const loadPicks = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePicks = resolve;
        })
    );
    const hydrate = createHistoricalDraftHydrator({
      loadMetadata,
      loadPicks,
    });
    const league = buildLeague();

    const first = hydrate(league);
    const second = hydrate(league);
    await vi.waitFor(() => expect(loadPicks).toHaveBeenCalledOnce());
    resolvePicks([]);
    await Promise.all([first, second]);
    await hydrate(league);

    expect(loadMetadata).toHaveBeenCalledTimes(1);
    expect(loadPicks).toHaveBeenCalledTimes(1);
    expect(league.draftPicks).toEqual([]);
  });

  test("reuses existing draft metadata when fallback hydration is needed", async () => {
    const loadMetadata = vi.fn();
    const loadPicks = vi.fn().mockResolvedValue([]);
    const hydrate = createHistoricalDraftHydrator({
      loadMetadata,
      loadPicks,
    });

    await hydrate(
      buildLeague({
        draftMetadata: { order: [], roundReversal: 0, draftType: "linear" },
      })
    );

    expect(loadMetadata).not.toHaveBeenCalled();
    expect(loadPicks).toHaveBeenCalledOnce();
    expect(loadPicks.mock.calls[0][4]).toBe("linear");
  });

  test("backfills an auction budget without reloading existing picks", async () => {
    const loadMetadata = vi.fn().mockResolvedValue({
      type: "auction",
      settings: { budget: 200 },
    });
    const loadPicks = vi.fn();
    const hydrate = createHistoricalDraftHydrator({
      loadMetadata,
      loadPicks,
    });
    const league = buildLeague({
      draftPicks: [{ position: "RB" }],
      draftMetadata: {
        order: [],
        roundReversal: 0,
        draftType: "auction",
      },
    });

    await hydrate(league);

    expect(loadMetadata).toHaveBeenCalledOnce();
    expect(loadPicks).not.toHaveBeenCalled();
    expect(league.draftMetadata.auctionBudget).toBe(200);
  });
});
