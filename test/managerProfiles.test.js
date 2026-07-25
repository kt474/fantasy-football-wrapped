import { describe, expect, test } from "vitest";
import { getRivalryReportPairKey } from "../src/lib/rivalryReport.ts";

describe("manager profiles", () => {
  test("uses the same rivalry report key when managers are reversed", () => {
    expect(getRivalryReportPairKey(["manager-b", "manager-a"])).toBe(
      getRivalryReportPairKey(["manager-a", "manager-b"])
    );
  });
});
