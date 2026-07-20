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
    const tradeAssetDialog = read(
      "src/components/trade_lab/TradeAssetDialog.vue"
    );
    const recap = read("src/components/playoffs/LeagueSummary.vue");

    expect(tradeAssetDialog).toContain("Add assets for");
    expect(recap).toContain('aria-label="Copy league recap"');
  });

  test("premium report actions stay visible and explain why they are disabled", () => {
    const summary = read(
      "src/components/weekly_report/WeeklyReportSummary.vue"
    );

    expect(summary).toContain("const canUsePremiumReportActions = computed");
    expect(summary).toContain(':disabled="videoActionDisabled"');
    expect(summary).toContain(':disabled="shareActionDisabled"');
    expect(summary.match(/:title="premiumActionTitle"/g)).toHaveLength(1);
    expect(summary).toContain(':title="videoActionTitle"');
    expect(summary).not.toContain('v-if="showShareButton"');
    expect(summary).toContain("tier === 'Premium'");
    expect(summary).toContain("grid-cols-[1fr_auto]");
    expect(summary).toContain("col-span-2 row-start-3");
    expect(summary).toContain("grid-flow-col auto-cols-8");
    expect(summary).toContain("justify-self-start");
    expect(summary).toContain("sm:ml-auto");
    expect(summary).toContain("sm:col-auto sm:row-auto sm:ml-auto sm:flex");
    expect(summary).toContain("col-start-2 row-start-1 ml-auto flex gap-2");
    expect(summary.match(/class="h-8"/g)).toHaveLength(2);
    expect(summary.match(/h-8 min-w-0 px-2 sm:w-auto/g)).toHaveLength(3);
    expect(summary).not.toContain("h-10 w-10 min-w-0 px-2");
    expect(summary.match(/<span class="sm:hidden">/g)).toHaveLength(3);
    expect(summary).toContain('aria-label="Watch weekly recap video"');
    expect(summary).toContain("Watch video");
    expect(summary).toContain('@click="videoDialogOpen = true"');
    expect(summary).toContain("<DialogTitle>Weekly recap video</DialogTitle>");
    expect(summary).toContain('v-if="videoDialogOpen && videoUrl"');
    expect(summary).toContain("3 video generations per rolling 7 days");
    expect(summary).toContain("Videos remain available for 15");
    expect(summary).toContain("Download MP4");
    expect(summary).toContain(':href="videoDownloadUrl"');
    expect(summary).toContain('@click="trackVideoDownload"');
    expect(summary).toContain('url.searchParams.set("download", "1")');
    expect(summary).toContain("download a copy during that window");
    expect(summary).not.toContain(':href="videoUrl"');
  });

  test("rivalry reports use a comfortable reading width and markdown rhythm", () => {
    const comparison = read(
      "src/components/league_history/ManagerComparison.vue"
    );

    expect(comparison).toContain("max-w-[86ch]");
    expect(comparison).toContain("text-base leading-7");
    expect(comparison).toContain("rivalry-report");
    expect(comparison).not.toContain(
      "rivalry-report mt-4 max-w-[86ch] rounded-card"
    );
    expect(comparison).toContain(".rivalry-report :deep(p + p)");
    expect(comparison).toContain(".rivalry-report :deep(blockquote)");
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
