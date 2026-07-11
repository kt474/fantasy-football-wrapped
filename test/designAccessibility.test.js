import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("design accessibility contracts", () => {
  test("sortable expected-wins columns use buttons and expose sort state", () => {
    const table = read("src/components/expected_wins/ExpectedWinsCard.vue");

    expect(table.match(/<button/g)).toHaveLength(3);
    expect(table.match(/:aria-sort=/g)).toHaveLength(3);
    expect(table.match(/min-h-11/g)).toHaveLength(3);
  });

  test("the switch keeps a 44px hit target around its visual track", () => {
    const switchControl = read("src/components/ui/switch/Switch.vue");

    expect(switchControl).toContain("h-11 w-12");
    expect(switchControl).toContain('aria-hidden="true"');
  });

  test("click handlers are not attached to non-interactive text containers", () => {
    const files = globSync("src/{components,views}/**/*.vue");
    const nonInteractiveClick =
      /<(div|span|p|li)\b[^>]*@click|<(div|span|p|li)\b[^>]*\n[^>]*@click/g;
    const violations = files.flatMap((file) => {
      const matches = read(file).match(nonInteractiveClick);
      return matches ? matches.map(() => file) : [];
    });

    expect(violations).toEqual([]);
  });

  test("all migrated sortable tables expose their current sort state", () => {
    const files = [
      "src/components/expected_wins/ExpectedWinsCard.vue",
      "src/components/standings/Table.vue",
      "src/components/league_history/LeagueHistory.vue",
      "src/components/roster_management/ManagementCard.vue",
    ];

    expect(
      files.reduce(
        (count, file) =>
          count + (read(file).match(/:aria-sort=/g)?.length ?? 0),
        0
      )
    ).toBe(15);
  });

  test("the mobile league switcher can shrink beside its actions menu", () => {
    const switcher = read("src/components/layout/LeagueSwitcher.vue");

    expect(switcher).toContain("flex w-full min-w-0 items-center");
    expect(switcher).toContain(
      "min-w-0 flex-1 min-[390px]:w-[200px] min-[390px]:flex-none"
    );
    expect(switcher).toContain("flex shrink-0 md:hidden");
  });

  test("icon-only feature actions expose descriptive names", () => {
    const tradeLab = read("src/components/trade_lab/TradeLab.vue");
    const recap = read("src/components/playoffs/LeagueSummary.vue");

    expect(tradeLab).toContain("Add assets for");
    expect(recap).toContain('aria-label="Copy league recap"');
  });

  test("wide data tables advertise keyboard-accessible horizontal scrolling", () => {
    const scrollableTable = read(
      "src/components/layout/ScrollableTableCard.vue"
    );

    expect(scrollableTable).toContain('role="region"');
    expect(scrollableTable).toContain(":tabindex=");
    expect(scrollableTable).toContain("Scroll horizontally for more columns.");
    expect(scrollableTable).toContain("canScrollRight");
    expect(scrollableTable).toContain(
      '@keydown.right.prevent="scrollByKeyboard(1)"'
    );
  });

  test("categorical charts share mobile label and legend behavior", () => {
    const responsiveCharts = read("src/lib/chartResponsive.ts");

    expect(responsiveCharts).toContain("breakpoint: 640");
    expect(responsiveCharts).toContain('fontSize: "10px"');
    expect(responsiveCharts).toContain('horizontalAlign: "center"');
    expect(responsiveCharts).toContain("offsetX: 0");
  });
});
