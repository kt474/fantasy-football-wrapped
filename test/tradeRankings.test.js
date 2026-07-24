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
    expect(source).toContain('emit("buildTrade", { playerId: player.playerId, rosterId })');
    expect(source).toContain("Build trade");
    expect(playerValuesSource).toContain(
      '@build-trade="openPlayerInTradeBuilder"'
    );
    expect(playerValuesSource).toContain('tradeMode: "builder"');
    expect(playerValuesSource).toContain("tradePlayerId: playerId");
    expect(playerValuesSource).toContain("tradeRosterId: String(rosterId)");
  });

  test("makes preview scope, freshness, and the value scale explicit", () => {
    expect(source).toContain("· Refreshed ${refreshedAt}");
    expect(source).toContain("text-muted-foreground lg:block");
    expect(source).toContain("text-muted-foreground lg:hidden");
    expect(source).toContain('class="max-lg:!mt-1 space-y-3"');
    expect(playerValuesSource).toMatch(
      /Preview includes \{\{ visiblePlayerCount \}\}\/\s*\{\{ totalPlayers \}\}/
    );
    expect(source).toContain("league relative comparison score");
    expect(source).toContain(
      '{ label: "Elite", range: "80+", variant: "success" }'
    );
    expect(source).toContain(
      '{ label: "Replacement", range: "0 or below", variant: "outline" }'
    );
  });
});
