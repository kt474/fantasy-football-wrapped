import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const source = readFileSync(
  new URL("../src/components/trade_lab/TradeRankings.vue", import.meta.url),
  "utf8"
);
const playerValuesSource = readFileSync(
  new URL("../src/components/player_values/PlayerValues.vue", import.meta.url),
  "utf8"
);

describe("trade rankings filters", () => {
  test("filters player values by player, manager, and position", () => {
    expect(source).toContain('const playerSearch = ref("")');
    expect(source).toContain('const selectedManagerId = ref("ALL")');
    expect(source).toContain("String(roster.id) === selectedManagerId.value");
    expect(source).toContain('v-model="playerSearch"');
    expect(source).toContain('v-model="selectedManagerId"');
    expect(source).toContain("All managers");
    expect(source).toContain('placeholder="Search players"');
  });

  test("starts a trade from the selected ranking row", () => {
    expect(source).toContain('event: "buildTrade"');
    expect(source).toContain(
      'emit("buildTrade", { playerId: player.playerId, rosterId })'
    );
    expect(source).toContain("Build trade");
    expect(playerValuesSource).toContain(
      '@build-trade="openPlayerInTradeBuilder"'
    );
    expect(playerValuesSource).toContain('tradeMode: "builder"');
    expect(playerValuesSource).toContain("tradePlayerId: playerId");
    expect(playerValuesSource).toContain("tradeRosterId: String(rosterId)");
  });
});
