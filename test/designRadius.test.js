import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("design radius contracts", () => {
  test("shared controls and surfaces use semantic radius roles", () => {
    expect(read("src/components/ui/button/index.ts")).toContain(
      "rounded-control",
    );
    expect(read("src/components/ui/input/Input.vue")).toContain(
      "rounded-control",
    );
    expect(read("src/components/ui/card/Card.vue")).toContain("rounded-card");
    expect(read("src/components/layout/SectionCard.vue")).toContain(
      "rounded-card",
    );
  });

  test("large presentation radii stay in documented expressive surfaces", () => {
    const allowed = new Set([
      "src/components/home/IntroSections.vue",
      "src/components/ui/sidebar/SidebarInset.vue",
      "src/components/weekly_report/WeeklyShareCard.vue",
      "src/views/Account.vue",
    ]);
    const violations = globSync("src/{components,views}/**/*.vue").filter(
      (file) =>
        !file.startsWith("src/components/wrapped/") &&
        !allowed.has(file) &&
        /rounded-(?:xl|2xl|3xl)/.test(read(file)),
    );

    expect(violations).toEqual([]);
  });
});
