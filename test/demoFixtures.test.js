import { describe, expect, test } from "vitest";

import {
  loadDemoCurrentTrends,
  loadDemoDraft,
  loadDemoDraftGrades,
  loadDemoLeague,
  loadDemoManagerProfiles,
  loadDemoPlayerRankings,
  loadDemoPlayoffs,
  loadDemoProjections,
  loadDemoRosterManagement,
  loadDemoRosterRankings,
  loadDemoStartSit,
  loadDemoWeeklyReport,
} from "../src/data/demo/loaders.ts";

describe("demo fixtures", () => {
  test("loads feature-scoped fixtures independently", async () => {
    const league = await loadDemoLeague();
    expect(league.fakeUsers).toHaveLength(10);
    expect(league.fakeRosters).toHaveLength(10);
    expect(league.fakePoints).toHaveLength(10);

    const weeklyReport = await loadDemoWeeklyReport();
    expect(weeklyReport.fakeWeeklyPreview.length).toBeGreaterThan(0);
    expect(weeklyReport.fakeTopPerformers.length).toBeGreaterThan(0);

    const rosterManagement = await loadDemoRosterManagement();
    expect(rosterManagement.fakeWaiverMoves.length).toBeGreaterThan(0);
    expect(rosterManagement.fakeTrades.length).toBeGreaterThan(0);

    const currentTrends = await loadDemoCurrentTrends();
    expect(currentTrends.fakeHighlights.length).toBeGreaterThan(0);

    const playoffs = await loadDemoPlayoffs();
    expect(playoffs.fakeWinnersBracket.length).toBeGreaterThan(0);
    expect(playoffs.fakeLosersBracket.length).toBeGreaterThan(0);

    const projections = await loadDemoProjections();
    expect(projections.fakeProjectionData).toHaveLength(10);

    const startSit = await loadDemoStartSit();
    expect(startSit.fakePosts.length).toBeGreaterThan(0);
    expect(startSit.fakeStartSit.length).toBeGreaterThan(0);

    const managerProfiles = await loadDemoManagerProfiles();
    expect(managerProfiles.fakeManagerProfiles.length).toBeGreaterThan(0);
    expect(managerProfiles.fakeProfileText).toBeTruthy();

    const draft = await loadDemoDraft();
    const draftGrades = await loadDemoDraftGrades();
    expect(draft.fakeDraftData.length).toBeGreaterThan(0);
    expect(draftGrades.fakeDraftGrades.length).toBeGreaterThan(0);

    const playerRankings = await loadDemoPlayerRankings();
    const rosterRankings = await loadDemoRosterRankings();
    expect(Object.keys(playerRankings.fakePlayerRankings)).toContain("QB");
    expect(Object.keys(rosterRankings.fakeRosterData).length).toBeGreaterThan(0);
  });
});
