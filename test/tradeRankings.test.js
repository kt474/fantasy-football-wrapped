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
  test("filters player values by manager without adding search", () => {
    expect(source).toContain('const selectedManagerId = ref("ALL")');
    expect(source).toContain("String(roster.id) === selectedManagerId.value");
    expect(source).toContain('v-model="selectedManagerId"');
    expect(source).toContain("All managers");
    expect(source).not.toContain('placeholder="Search');
  });

  test("makes preview scope, freshness, and the value scale explicit", () => {
    expect(source).toContain("League data refreshed");
    expect(playerValuesSource).toContain(
      "Preview includes {{ visiblePlayerCount }} of"
    );
    expect(playerValuesSource).toContain("{{ totalPlayers }} rostered players");
    expect(source).toContain("league relative comparison score");
    expect(source).toContain(
      '{ label: "Elite", range: "80+", variant: "success" }'
    );
    expect(source).toContain(
      '{ label: "Replacement", range: "0 or below", variant: "outline" }'
    );
  });
});
