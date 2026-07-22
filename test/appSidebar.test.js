import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const sidebarSource = readFileSync(
  fileURLToPath(
    new URL("../src/components/layout/AppSidebar.vue", import.meta.url),
  ),
  "utf8",
);

describe("app sidebar", () => {
  test("only highlights league tabs on the main route", () => {
    expect(sidebarSource).toContain(
      "route.path === '/' && store.currentTab === childItem.title",
    );
  });

  test("filters hidden league features from navigation", () => {
    expect(sidebarSource).toContain(
      ".filter(({ id }) => store.isLeagueFeatureVisible(id))",
    );
  });
});
