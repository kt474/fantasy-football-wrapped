import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { getRivalryReportPairKey } from "../src/lib/rivalryReport.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("manager profiles", () => {
  test("uses the same rivalry report key when managers are reversed", () => {
    expect(getRivalryReportPairKey(["manager-b", "manager-a"])).toBe(
      getRivalryReportPairKey(["manager-a", "manager-b"])
    );
  });

  test("hydrates draft data before rebuilding profile metrics", () => {
    const narratives = read("src/components/league_narratives/Narratives.vue");
    const refresh = narratives.slice(
      narratives.indexOf("const refreshNarratives"),
      narratives.indexOf("const prepareManagerPayload")
    );

    expect(
      refresh.indexOf("await ensureHistoricalDraftData()")
    ).toBeGreaterThan(-1);
    expect(refresh.indexOf("await rebuildNarratives()")).toBeGreaterThan(
      refresh.indexOf("await ensureHistoricalDraftData()")
    );
    expect(narratives).toContain("await refreshNarratives()");
  });

  test("disables profile generation after every eligible manager has a profile", () => {
    const card = read(
      "src/components/league_narratives/ManagerArchetypesCard.vue"
    );

    expect(card).toContain("const allManagerProfilesGenerated = computed");
    expect(card).toContain("props.payload.managers.every((manager)");
    expect(card).toContain(
      "Boolean(blurbsByUserId.value[manager.userId]?.trim())"
    );
    expect(card).toContain("!allManagerProfilesGenerated.value");
    expect(card).toContain(':disabled="!canGenerateArchetypes"');
  });

  test("restores and refreshes cached rivalry reports by manager pair", () => {
    const comparison = read(
      "src/components/league_history/ManagerComparison.vue"
    );

    expect(comparison).toContain("getRivalryReportPairKey");
    expect(comparison).toContain("loadSavedRivalryReport");
    expect(comparison).toContain("store.currentLeague?.rivalryReports");
    expect(comparison).toContain("store.addRivalryReport");
    expect(comparison).toContain(
      ':disabled="isGeneratingReport || Boolean(generatedReport)"'
    );
    expect(comparison).toContain(
      "!subscriptionStore.isPremium || generatedReport.value"
    );
    expect(comparison).toContain("Report generated");
  });
});
