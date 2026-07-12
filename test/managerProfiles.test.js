import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("manager profiles", () => {
  test("hydrates draft data before rebuilding profile metrics", () => {
    const narratives = read(
      "src/components/league_narratives/Narratives.vue"
    );
    const refresh = narratives.slice(
      narratives.indexOf("const refreshNarratives"),
      narratives.indexOf("const prepareManagerPayload")
    );

    expect(refresh.indexOf("await ensureHistoricalDraftData()"))
      .toBeGreaterThan(-1);
    expect(refresh.indexOf("await rebuildNarratives()"))
      .toBeGreaterThan(refresh.indexOf("await ensureHistoricalDraftData()"));
    expect(narratives).toContain("await refreshNarratives()");
  });
});
