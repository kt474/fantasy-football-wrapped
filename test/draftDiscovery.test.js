import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const draftComponent = readFileSync(
  new URL("../src/components/draft/Draft.vue", import.meta.url),
  "utf8"
);

describe("Draft Room discovery", () => {
  test("links the Draft view to Manager Profiles and preserves the selected tab", () => {
    expect(draftComponent).toContain("Planning your next draft?");
    expect(draftComponent).toContain("Premium Draft Room scouting");
    expect(draftComponent).not.toContain("draft-room-discovery-title");
    expect(draftComponent).toContain('store.currentTab = "Manager Profiles"');
    expect(draftComponent).toContain(
      'localStorage.setItem("currentTab", "Manager Profiles")'
    );
    expect(draftComponent).toContain('scrollAppToTop("smooth")');
  });
});
