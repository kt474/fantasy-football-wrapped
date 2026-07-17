import { describe, expect, test } from "vitest";

import { formatOrdinal, getOrdinalSuffix } from "../src/lib/format.ts";
import { getManagerDisplayName } from "../src/lib/manager.ts";

describe("shared formatting", () => {
  test.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
  ])("formats %i as %s", (value, expected) => {
    expect(formatOrdinal(value)).toBe(expected);
  });

  test("exposes the suffix independently", () => {
    expect(getOrdinalSuffix(22)).toBe("nd");
  });
});

describe("manager display names", () => {
  const manager = { name: "Team Name", username: "manager-name" };

  test("selects the configured identity", () => {
    expect(getManagerDisplayName(manager, false)).toBe("Team Name");
    expect(getManagerDisplayName(manager, true)).toBe("manager-name");
  });

  test("uses a consistent fallback", () => {
    expect(getManagerDisplayName({ name: "", username: "" }, true)).toBe(
      "Ghost Roster"
    );
  });
});
