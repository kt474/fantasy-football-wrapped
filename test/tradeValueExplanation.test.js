import { describe, expect, test } from "vitest";
import { buildTradeValueExplanation } from "../src/lib/tradeValueExplanation";

const makePlayer = (overrides = {}) => ({
  playerId: "player",
  name: "Test Player",
  position: "WR",
  team: "MIN",
  projectedPoints: 200,
  replacementPoints: 100,
  vorp: 100,
  tradeValue: 90,
  positionRank: 1,
  overallRank: 1,
  dynastyAdp: null,
  ...overrides,
});

const explain = (player, players) =>
  buildTradeValueExplanation({
    player,
    players,
    valuationMode: "ros projection",
    dynastyPerspective: "balanced",
  });

describe("trade value explanations", () => {
  test("uses specific headlines for the top three position ranks", () => {
    const first = makePlayer();
    const second = makePlayer({
      playerId: "second",
      name: "Second Player",
      vorp: 90,
      tradeValue: 88,
      positionRank: 2,
      overallRank: 2,
    });
    const third = makePlayer({
      playerId: "third",
      name: "Third Player",
      vorp: 80,
      tradeValue: 86,
      positionRank: 3,
      overallRank: 3,
    });
    const fourth = makePlayer({
      playerId: "fourth",
      name: "Fourth Player",
      vorp: 70,
      tradeValue: 84,
      positionRank: 4,
      overallRank: 4,
    });
    const players = [first, second, third, fourth];

    expect(explain(first, players)).toMatch(
      /^Test Player leads all rostered WRs in VORP/
    );
    expect(explain(second, players)).toMatch(/^A WR2 standing/);
    expect(explain(third, players)).toMatch(
      /^Third Player's top three standing/
    );
  });

  test("leads with a nearby lower priced option when one exists", () => {
    const player = makePlayer();
    const alternative = makePlayer({
      playerId: "alternative",
      name: "Alternative Player",
      vorp: 98,
      tradeValue: 80,
      positionRank: 2,
      overallRank: 8,
    });

    expect(explain(player, [player, alternative])).toMatch(
      /^Test Player carries a 90.0 elite rating, but similar production is available/
    );
  });

  test("gives equal VORP values the same rank", () => {
    const first = makePlayer();
    const second = makePlayer({
      playerId: "second",
      name: "Second Player",
      tradeValue: 89,
      positionRank: 2,
      overallRank: 2,
    });
    const players = [first, second];

    expect(explain(first, players)).toContain("That VORP ranks 1st");
    expect(explain(second, players)).toContain("That VORP ranks 1st");
  });
});
