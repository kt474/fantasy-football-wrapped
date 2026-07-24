import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Trade Lab correctness boundaries", () => {
  test("the free quote UI uses categorical results without exact totals", () => {
    const api = read("src/api/tradeValuesApi.ts");
    const tradeLab = read("src/components/trade_lab/TradeLab.vue");

    expect(api).toContain('favoredSide: "team_a" | "team_b" | "even"');
    expect(api).toContain('"greater_than_35_percent"');
    expect(api).not.toContain("teamAValue");
    expect(api).not.toContain("teamBValue");
    expect(tradeLab).not.toContain("valueGapPercent");
    expect(tradeLab).not.toContain("Server-calculated package total");
  });

  test("quotes carry roster IDs and expose a transient-failure retry", () => {
    const tradeLab = read("src/components/trade_lab/TradeLab.vue");

    expect(tradeLab).toContain("teamARosterId: selectedTeamAId.value");
    expect(tradeLab).toContain("teamBRosterId: selectedTeamBId.value");
    expect(tradeLab).toContain("@click=\"retryTradeQuote\"");
    expect(tradeLab).toContain("const currentRequestId = ++quoteRequestId");
  });

  test("roster enrichment is stale-safe and does not watch rank merges to reset trades", () => {
    const tradeLab = read("src/components/trade_lab/TradeLab.vue");

    expect(tradeLab).toContain("currentRequestId !== rosterRequestId");
    expect(tradeLab).not.toContain("() => rosters.value,\n  () => syncTeamSelections()");
  });

  test("same-league refreshes reload rankings and Trade Lab data", () => {
    const playerValues = read(
      "src/components/player_values/PlayerValues.vue"
    );
    const tradeLab = read("src/components/trade_lab/TradeLab.vue");

    expect(playerValues).toContain(
      "() => activeLeague.value?.lastUpdated"
    );
    expect(tradeLab).toContain("() => activeLeague.value?.lastUpdated");
  });

  test("Trade Lab initializes once and bounds roster ranking requests", () => {
    const tradeLab = read("src/components/trade_lab/TradeLab.vue");
    const leagueTradeValues = read("src/lib/leagueTradeValues.ts");

    expect(tradeLab).not.toContain(
      "selectedWeek.value = fallbackWeek.value;\n  await fetchPlayers();"
    );
    expect(leagueTradeValues).toContain(
      "const TRADE_BUILDER_RANKING_CONCURRENCY = 8"
    );
    expect(leagueTradeValues).toContain(
      "const basicRankingEntries = await mapWithConcurrency("
    );
    expect(leagueTradeValues).not.toContain(
      "const basicRankingEntries = await Promise.all("
    );
  });

  test("rankings and Finder have distinct retry and entitlement states", () => {
    const playerValues = read(
      "src/components/player_values/PlayerValues.vue"
    );
    const tradeFinder = read("src/components/trade_lab/TradeFinder.vue");

    expect(playerValues).toContain("Retry rankings");
    expect(tradeFinder).toContain("Retry Trade Finder");
    expect(tradeFinder).toContain("v-else-if=\"accessError\"");
    expect(tradeFinder).toContain("v-else-if=\"finderError\"");
  });

  test("suppresses the generic rankings empty state during errors", () => {
    const playerValues = read(
      "src/components/player_values/PlayerValues.vue"
    );

    expect(playerValues).toContain('v-if="!errorMessage"');
  });

  test("supports opening Trade Lab directly in Finder mode", () => {
    const tradeLab = read("src/components/trade_lab/TradeLab.vue");

    expect(tradeLab).toContain(
      'route.query.tradeMode === "finder" ? "finder" : "builder"'
    );
  });
});
